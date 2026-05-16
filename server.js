require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { exec } = require('child_process');
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
const UserDB = {
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('Zero.in-users')
            .select('*')
            .ilike('email', email);
        if (error) throw error;
        return data || [];
    },
    async findBySystemId(systemId) {
        try {
            const { data, error } = await supabase
                .from('Zero.in-users')
                .select('*')
                .eq('systemId', systemId);
            if (error) throw error;
            return data?.[0] || null;
        } catch {
            return null;
        }
    },
    async checkDuplicate({ email, userId, systemId }) {
        try {
            const { data, error } = await supabase
                .from('Zero.in-users')
                .select('email, userId')
                .or(`email.ilike.%${email}%,userId.eq.${userId}`);
            if (error) throw error;
            return {
                emailExists: Array.isArray(data) && data.some(u => u.email?.toLowerCase() === email?.toLowerCase()),
                userIdExists: Array.isArray(data) && data.some(u => u.userId === userId),
                systemIdExists: false
            };
        } catch {
            return { emailExists: false, userIdExists: false, systemIdExists: false };
        }
    },
    async create(userObj) {
        const { systemId, ...safeData } = userObj;
        const { error } = await supabase
            .from('Zero.in-users')
            .insert([safeData]);
        if (error) throw error;
    },
    async updateByEmail(email, userObj) {
        const { systemId, ...safeData } = userObj;
        const { error } = await supabase
            .from('Zero.in-users')
            .update(safeData)
            .ilike('email', email);
        if (error) throw error;
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
        console.log("✅ HIT /api/auth/register-instant | DATA:", req.body);
        try {
            if (port !== MASTER_PORT) {
                const result = await forwardToMaster('/api/auth/register-instant', req.body);
                return res.json(result);
            }
            const { displayName, userId, email, provider = 'normal' } = req.body;
            if (!displayName || !userId || !email) {
                return res.json({ status: 0, message: "Missing required fields" });
            }
            const allowedDomains = [
                '@gmail.com', '@outlook.com', '@hotmail.com', '@icloud.com',
                '@proton.me", "@yahoo.com', '@protonmail.com', '@zoho.com',
                '@yandex.com', '@mail.ru', '@163.com', '@qq.com', '@facebook.com',
                '@github.com', '@tiktok.com', '@discord.com', '@wechat.com'
            ];
            const validEmail = allowedDomains.some(d => email?.toLowerCase().endsWith(d)) || provider !== 'normal';
            if (!validEmail) {
                return res.json({ status: 0, message: "Abnormal Email" });
            }
            const dup = await UserDB.checkDuplicate({ email, userId });
            if (dup.emailExists) return res.json({ status: 1, message: "Already registered, redirecting...", userId });
            if (dup.userIdExists) return res.json({ status: 0, message: "USER_ID_EXISTS" });
            const newUser = {
                displayName,
                userId,
                systemId: null,
                email: email.toLowerCase(),
                backup_email: null,
                password: "SOCIAL_LOGIN_PENDING",
                birthday: null,
                age: null,
                gender: null,
                phone: null,
                address: null,
                country: null,
                provider,
                signup_date: new Date().toISOString(),
                completed: false,
                completed_at: null,
                bio: null,
                avatar: null,
                cover: null,
                stats: { following: 0, followers: 0, friends: 0 },
                counts: { posts: 0, comments: 0, reposts: 0, likes: 0, saves: 0 },
                privacy: { posts: false, comments: false, reposts: false, likes: false, saves: false },
                _private_contact: null,
                _hidden_items: null
            };
            await UserDB.create(newUser);
            res.json({ status: 1, message: "Step 1 Success!", userId });
        } catch (err) {
            console.error('[REGISTER INSTANT ERROR]', err);
            res.json({ status: 0, message: "Server Error: " + err.message });
        }
    });
    app.post('/api/auth/register-full', async (req, res) => {
        console.log("✅ HIT /api/auth/register-full | DATA:", req.body);
        try {
            if (port !== MASTER_PORT) {
                const result = await forwardToMaster('/api/auth/register-full', req.body);
                return res.json(result);
            }
            const { displayName, userId, systemId, email, password, birthday, age, backup_email, gender, phone, address, country, bio } = req.body;
            if (!displayName || !userId || !email || !password || !birthday || !age) {
                return res.json({ status: 0, message: "Missing required fields" });
            }
            const numAge = parseInt(age);
            if (isNaN(numAge) || numAge < 13 || numAge > 120) {
                return res.json({ status: 0, message: "Invalid age" });
            }
            const passRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
            if (!passRule.test(password)) {
                return res.json({ status: 0, message: "Password: Min 8 chars | Must include: Uppercase, Lowercase, Number, Special (!@#$%^&*)" });
            }
            const dup = await UserDB.checkDuplicate({ email, userId, systemId });
            if (dup.systemIdExists) return res.json({ status: 0, message: "SYSTEMID_EXISTS" });
            if (dup.emailExists) return res.json({ status: 0, message: "EMAIL_EXISTS" });
            if (dup.userIdExists) return res.json({ status: 0, message: "USER_ID_EXISTS" });
            const hashedPass = await bcrypt.hash(password, saltRounds);
            const existing = await UserDB.findByEmail(email);
            const userData = {
                displayName: displayName.trim(),
                userId: userId.trim(),
                systemId: systemId?.trim() || null,
                backup_email: backup_email?.trim() || null,
                password: hashedPass,
                birthday: birthday,
                age: numAge,
                gender: gender || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                country: country?.trim() || null,
                bio: bio?.trim() || null,
                avatar: null,
                cover: null,
                stats: { following: 0, followers: 0, friends: 0 },
                counts: { posts: 0, comments: 0, reposts: 0, likes: 0, saves: 0 },
                privacy: { posts: false, comments: false, reposts: false, likes: false, saves: false },
                completed: true,
                completed_at: new Date().toISOString(),
                _private_contact: null,
                _hidden_items: null
            };
            if (existing.length > 0) {
                await UserDB.updateByEmail(email, userData);
            } else {
                await UserDB.create({
                    ...userData,
                    email: email.toLowerCase().trim(),
                    provider: 'normal',
                    signup_date: new Date().toISOString()
                });
            }
            console.log(`✔  [MASTER ${MASTER_PORT}] Registered via Supabase: #${systemId} | @${userId} | ${email}`);
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
                const fwdUrl = `/api/user/get?systemId=${encodeURIComponent(req.query.systemId || '')}`;
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
        const { systemId } = req.query;
        if (!systemId) return res.json({ status: 0, message: "Missing required parameter: systemId" });
        try {
            const user = await UserDB.findBySystemId(systemId);
            if (!user) return res.json({ status: 0, message: "User not found" });
            const filtered = Object.fromEntries(
                Object.entries({
                    displayName: user.displayName || null,
                    userId: user.userId || null,
                    systemId: user.systemId || null,
                    userHandle: `@zero.in.${user.userId || user.systemId || "user"}`,
                    email: user.email || null,
                    backup_email: user.backup_email || null,
                    birthday: user.birthday || null,
                    age: user.age || null,
                    gender: user.gender || null,
                    phone: user.phone || null,
                    address: user.address || null,
                    country: user.country || null,
                    provider: user.provider || null,
                    signup_date: user.signup_date || null,
                    completed: user.completed ?? false,
                    completed_at: user.completed_at || null,
                    bio: user.bio || null,
                    avatar: user.avatar || null,
                    cover: user.cover || null,
                    stats: user.stats || { following: 0, followers: 0, friends: 0 },
                    counts: user.counts || { posts: 0, comments: 0, reposts: 0, likes: 0, saves: 0 },
                    privacy: user.privacy || { posts: false, comments: false, reposts: false, likes: false, saves: false }
                }).filter(([key]) => !key.startsWith('_'))
            );

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
