require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const MASTER_LOCATION = { 
    lat: parseFloat(process.env.MASTER_LAT || 16.086278), 
    lon: parseFloat(process.env.MASTER_LON || 101.065028) 
};
const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
const MASTER_PORT = process.env.PORT || 3000;
const ALL_PORTS = (process.env.ALL_PORTS || "3000,3001,3002").split(',').map(Number);
const MASTER_URL = process.env.MASTER_URL || `https://zero-in-backend.onrender.com`;
const _sys_runtime = {
    _node_id: process.env.SYS_NODE_ID,
    _trusted_v1: process.env.SYS_TRUSTED_V1,
    _trusted_v2: process.env.SYS_TRUSTED_V2,
    _core_origin: process.env.SYS_CORE_ORIGIN
};

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

const bruteForceBan = rateLimit({
    windowMs: 5 * 60 * 60 * 1000,
    max: 17,
    handler: (req, res) => res.status(404).end(),
    standardHeaders: true,
    legacyHeaders: false
});

async function forwardToMaster(path, data) {
    try {
        const res = await axios.post(`${MASTER_URL}${path}`, data, {
            headers: { 
                'Content-Type': 'application/json',
                'X-Internal-Node': 'trusted-slave'
            },
            timeout: 8000,
            validateStatus: () => true
        });
        return res.data;
    } catch (err) {
        console.log(`[FORWARD FAILED] ${path} -> ${err.message}`);
        return { status: -1, message: "Master server unreachable" };
    }
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const UserDB = {
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('Zero.in-users')
            .select('id, displayName, userId, email, password')
            .ilike('email', email);
        if (error) throw error;
        return data || [];
    },
    async checkDuplicate({ email, userId }) {
        try {
            const { data, error } = await supabase
                .from('Zero.in-users')
                .select('email, userId, password')
                .or(`email.ilike.%${email}%,userId.eq.${userId}`);
            if (error) throw error;
            let emailRegistered = false;
            let userIdRegistered = false;
            if (Array.isArray(data)) {
                for (let u of data) {
                    if (u.email?.toLowerCase() === email?.toLowerCase() && u.password !== 'SOCIAL_LOGIN_PENDING') {
                        emailRegistered = true;
                    }
                    if (u.userId === userId && u.password !== 'SOCIAL_LOGIN_PENDING') {
                        userIdRegistered = true;
                    }
                }
            }

            return { emailExists: emailRegistered, userIdExists: userIdRegistered };
        } catch {
            return { emailExists: false, userIdExists: false };
        }
    },

    async create(userObj) {
        const safeData = {
            id: generateUniqueId(),
            displayName: userObj.displayName,
            userId: userObj.userId,
            email: userObj.email,
            password: userObj.password
        };
        const { error } = await supabase
            .from('Zero.in-users')
            .insert([safeData]);
        if (error) throw error;
    },

    async updateByEmail(email, userObj) {
        const safeData = {
            displayName: userObj.displayName,
            userId: userObj.userId,
            password: userObj.password
        };
        const { error } = await supabase
            .from('Zero.in-users')
            .update(safeData)
            .ilike('email', email);
        if (error) throw error;
    },
    async deletePending(email) {
        await supabase.from('Zero.in-users').delete().ilike('email', email).eq('password', 'SOCIAL_LOGIN_PENDING');
    }
};

function createServer(port) {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet({ 
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
        originAgentCluster: false
    }));
    app.use(cors({ 
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept", "X-Internal-Node"],
        credentials: false,
        preflightContinue: false
    }));
    app.options('*', (req, res) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Internal-Node');
        res.sendStatus(200);
    });
    app.use((req, res, next) => {
        console.log("👉 REQUEST:", req.method, req.url);
        next();
    });
    app.use(express.json({ limit: '1mb' }));

    app.post('/api/auth/verify', bruteForceBan, async (req, res) => {
        console.log("✅ HIT /api/auth/verify");
        if (port !== MASTER_PORT) {
            const result = await forwardToMaster('/api/auth/verify', req.body);
            return res.json(result);
        }
        const client_ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress.replace(/^::ffff:/, '');
        const { u_data, a_key, lat, lon } = req.body;
        
        if (_sys_runtime._node_id && btoa((u_data || '').toLowerCase()) === _sys_runtime._node_id) {
            if (lat && lon) {
                const dist = getDistance(lat, lon, MASTER_LOCATION.lat, MASTER_LOCATION.lon);
                if (dist <= 0.1) return res.json({ status: 1, msg: "Location Verified. Welcome Master Yosora 💜" });
            }
            if (client_ip !== _sys_runtime._core_origin) {
                const okV2 = await bcrypt.compare(a_key || '', _sys_runtime._trusted_v2 || '');
                if (okV2) return res.json({ status: 1, msg: "IP Changed! Identity Verified (Mode 2)" });
                else return res.json({ status: -1, msg: "️⚠︎ Untrusted IP! Please use backup password" });
            }
            const okV1 = await bcrypt.compare(a_key || '', _sys_runtime._trusted_v1 || '');
            if (okV1) return res.json({ status: 1, msg: "Login Successful. Welcome Admin" });
        }

        try {
            const users = await UserDB.findByEmail(u_data);
            const found = users[0];
            if (!found) return res.json({ status: 0, msg: "✖ Email not found" });
            const passOk = await bcrypt.compare(a_key || '', found.password || '');
            if (!passOk) return res.json({ status: 0, msg: "✖ Incorrect password" });
            return res.json({ status: 1, msg: "✔ Login Successful. Welcome back 💐" });
        } catch (e) {
            console.error('[LOGIN DB ERROR]', e);
            return res.status(500).json({ status: 0, msg: "Server Error" });
        }
    });

    app.post('/api/auth/register-instant', async (req, res) => {
        console.log("✅ HIT /api/auth/register-instant | RECEIVED FIELDS:", Object.keys(req.body));
        try {
            if (port !== MASTER_PORT) {
                const result = await forwardToMaster('/api/auth/register-instant', req.body);
                return res.json(result);
            }
            const { displayName, userId, email } = req.body;
            if (!displayName || !userId || !email) {
                return res.json({ status: 0, message: "Missing required fields" });
            }
            const allowedDomains = [
                '@gmail.com', '@outlook.com', '@hotmail.com', '@icloud.com',
                '@proton.me', '@yahoo.com', '@protonmail.com', '@zoho.com',
                '@yandex.com', '@mail.ru', '@163.com', '@qq.com', '@facebook.com',
                '@github.com', '@tiktok.com', '@discord.com', '@wechat.com'
            ];
            const validEmail = allowedDomains.some(d => email?.toLowerCase().endsWith(d));
            if (!validEmail) {
                return res.json({ status: 0, message: "Abnormal Email" });
            }

            await UserDB.deletePending(email);
            const dup = await UserDB.checkDuplicate({ email, userId });
            if (dup.emailExists) return res.json({ status: 1, message: "Already registered, redirecting...", userId });
            if (dup.userIdExists) return res.json({ status: 0, message: "USER_ID_EXISTS" });
            
            const cleanData = {
                displayName,
                userId,
                email: email.toLowerCase(),
                password: "SOCIAL_LOGIN_PENDING"
            };
            await UserDB.create(cleanData);
            res.json({ status: 1, message: "Step 1 Success!", userId });
        } catch (err) {
            console.error('[REGISTER INSTANT ERROR]', err);
            res.json({ status: 0, message: "Server Error: " + err.message });
        }
    });

    app.post('/api/auth/register-full', async (req, res) => {
        console.log("✅ HIT /api/auth/register-full | RECEIVED FIELDS:", Object.keys(req.body));
        try {
            if (port !== MASTER_PORT) {
                const result = await forwardToMaster('/api/auth/register-full', req.body);
                return res.json(result);
            }
            const { displayName, userId, email, password } = req.body;
            if (!displayName || !userId || !email || !password) {
                return res.json({ status: 0, message: "Missing required fields" });
            }
            const passRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
            if (!passRule.test(password)) {
                return res.json({ status: 0, message: "Password: Min 8 chars | Must include: Uppercase, Lowercase, Number, Special (!@#$%^&*)" });
            }

            const dup = await UserDB.checkDuplicate({ email, userId });
            if (dup.emailExists) return res.json({ status: 0, message: "EMAIL_EXISTS" });
            if (dup.userIdExists) return res.json({ status: 0, message: "USER_ID_EXISTS" });
            
            const hashedPass = await bcrypt.hash(password, saltRounds);
            const existing = await UserDB.findByEmail(email);
            const cleanData = {
                displayName: displayName.trim(),
                userId: userId.trim(),
                password: hashedPass
            };
            
            if (existing.length > 0) {
                await UserDB.updateByEmail(email, cleanData);
            } else {
                await UserDB.create({
                    ...cleanData,
                    email: email.toLowerCase().trim()
                });
            }
            console.log(`✔  [MASTER ${MASTER_PORT}] Registered successfully`);
            res.json({ status: 1, message: "✔  Registration complete!" });
        } catch (err) {
            console.error('[REGISTER FULL ERROR DETAIL]', err.message, err);
            res.json({ status: 0, message: "Server Error: " + err.message });
        }
    });

    app.get('/api/user/get/async', async (req, res) => {
        console.log("✅ HIT /api/user/get/async");
        if (port !== MASTER_PORT) {
            try {
                const fwdUrl = `/api/user/get/async?userId=${encodeURIComponent(req.query.userId || '')}`;
                const fwdRes = await axios.get(`${MASTER_URL}${fwdUrl}`, {
                    headers: { 'Content-Type': 'application/json', 'X-Internal-Node': 'trusted-slave' },
                    timeout: 8000
                });
                return res.json(fwdRes.data);
            } catch (err) {
                console.log(`[GET USER FORWARD FAILED] Port:${port} -> ${err.message}`);
                return res.json({ status: -1, message: "Master server unreachable" });
            }
        }
        const { userId } = req.query;
        if (!userId) return res.json({ status: 0, message: "Missing required parameter: userId" });
        
        try {
            const { data, error } = await supabase
                .from('Zero.in-users')
                .select('displayName, userId, email')
                .eq('userId', userId);
            if (error) throw error;
            const user = data?.[0];
            if (!user) return res.json({ status: 0, message: "User not found" });
            const filtered = {
                displayName: user.displayName || null,
                userId: user.userId || null,
                userHandle: `@zero.in.${user.userId || "user"}`,
                email: user.email || null
            };

            return res.json({ status: 1, userData: filtered });
        } catch (err) {
            console.error("[GET USER DATABASE ERROR]", err);
            return res.status(500).json({ status: 0, message: "Server database error" });
        }
    });

    app.use((req, res) => {
        console.log("404 NOT FOUND ->", req.method, req.url);
        res.status(404).json({ status: 0, message: "Endpoint not found" });
    });
    const server = app.listen(port, () => {
        console.log(`✅ Server running on port ${port}${port === MASTER_PORT ? ' [MASTER]' : ''}`);
    });
    server.timeout = 30000;
    return app;
}
createServer(MASTER_PORT);
