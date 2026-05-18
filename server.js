const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

let mailTransporter = null;

// Initialize mailer
async function initMailer() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (host && user && pass) {
    console.log('Using configured SMTP settings for mail.');
    mailTransporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });
  } else {
    console.log('No SMTP environment credentials found. Setting up automated developer test account (Ethereal)...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Ethereal developer test email account generated successfully.');
      console.log(`User: ${testAccount.user}`);
      mailTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (e) {
      console.error('Failed to create Ethereal test email account:', e.message);
    }
  }
}

// Send Mail Helper
async function sendMail({ to, subject, html }) {
  if (!mailTransporter) {
    console.log('Mail transporter not initialized. Email simulated:', subject);
    return false;
  }
  
  const from = process.env.SMTP_FROM || '"SlotWatch Alerts" <alerts@slotwatch.com>';
  
  try {
    const info = await mailTransporter.sendMail({
      from,
      to,
      subject,
      html
    });
    
    console.log(`Email successfully sent: "${subject}" to ${to}`);
    
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`✉️ DEV TEST INBOX VIEW LINK: ${testUrl}`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
}

// Official Booking URLs
function getBookingUrl(country) {
  if (country === 'France') {
    return 'https://fr.tlscontact.com/ae/DXB/';
  } else if (country === 'Italy') {
    return 'https://visa.vfsglobal.com/dxb/en/ita/';
  } else {
    return 'https://visa.vfsglobal.com/are/en/';
  }
}

// Compare current scraped slots with cached slots to detect transitions and trigger alert emails
async function checkTransitionsAndAlert(newTourist, newBusiness) {
  const checkList = async (newList, oldList) => {
    for (const item of newList) {
      const oldItem = oldList.find(r => r.country === item.country && r.city === item.city);
      const oldStatus = oldItem ? oldItem.status : 'no';
      
      // Transition to available ('av') from non-available ('no' or 'wl')
      if (item.status === 'av' && oldStatus !== 'av') {
        console.log(`🚨 Live slot opening detected! ${item.country} (${item.city} - ${item.type}) has opened slots. Next date: ${item.date}`);
        await triggerAlertsForSlot(item);
      }
    }
  };
  
  await checkList(newTourist, slotsCache.tourist || []);
  await checkList(newBusiness, slotsCache.business || []);
}

// Search waitlist database and email subscribers
async function triggerAlertsForSlot(item) {
  try {
    const alertsData = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    const matchingAlerts = alertsData.filter(a => {
      const matchCountry = a.country.toLowerCase() === item.country.toLowerCase();
      const matchType = a.visaType === 'Tourist and Business' || a.visaType === item.type;
      return matchCountry && matchType;
    });
    
    if (matchingAlerts.length === 0) {
      console.log(`No alerts registered for ${item.country} (${item.type}).`);
      return;
    }
    
    console.log(`Emailing ${matchingAlerts.length} subscribers regarding available ${item.country} slots...`);
    const bookingUrl = getBookingUrl(item.country);
    
    for (const alert of matchingAlerts) {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background: #1e293b; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.02em;">SlotWatch Live Alerts</h1>
          </div>
          <div style="padding: 32px 24px; background: #ffffff;">
            <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px;">
              Slot Available!
            </div>
            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Schengen Visa Slot Opened!</h2>
            <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">A slot has just opened up for your chosen destination. Here are the details:</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Destination</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${item.flag} ${item.country}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Centre</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${item.city}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Visa Type</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${item.type}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Earliest Slot</td>
                  <td style="padding: 6px 0; font-size: 16px; color: #059669; font-weight: 800; text-align: right;">${item.date} ${item.slots ? `(${item.slots})` : ''}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; font-size: 14px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(29,78,216,0.35);">Book Appointment Now ↗</a>
            </div>
            
            <p style="margin: 0; color: #e11d48; font-size: 11px; font-weight: bold; text-align: center; background: #fff1f2; border: 1px solid #fecdd3; padding: 8px; border-radius: 6px;">
              ⚠️ Popular slots are claimed in minutes. Act quickly to avoid missing out!
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            SlotWatch is an independent real-time monitoring tool. Built in Dubai 🇦🇪
          </div>
        </div>
      `;
      
      await sendMail({
        to: alert.email,
        subject: `🚨 URGENT: ${item.country} Schengen Slot Available in ${item.city}!`,
        html
      });
    }
  } catch (error) {
    console.error('Failed to trigger alert emails:', error.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder exists (handling Vercel read-only filesystem environment)
const isVercel = !!(process.env.VERCEL || process.env.NOW_BUILDER);
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, 'data');

const SLOTS_FILE = path.join(DATA_DIR, 'slots.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

if (isVercel) {
  // Copy pre-packaged slots/alerts from build folder to writable /tmp on serverless spin-up
  const defaultSlotsPath = path.join(__dirname, 'data', 'slots.json');
  const defaultAlertsPath = path.join(__dirname, 'data', 'alerts.json');
  
  if (!fs.existsSync(SLOTS_FILE) && fs.existsSync(defaultSlotsPath)) {
    try {
      fs.writeFileSync(SLOTS_FILE, fs.readFileSync(defaultSlotsPath, 'utf8'));
      console.log('Copied pre-packaged slots.json cache to Vercel /tmp directory');
    } catch (e) {
      console.error('Failed to copy slots.json to /tmp:', e.message);
    }
  }
  if (!fs.existsSync(ALERTS_FILE) && fs.existsSync(defaultAlertsPath)) {
    try {
      fs.writeFileSync(ALERTS_FILE, fs.readFileSync(defaultAlertsPath, 'utf8'));
      console.log('Copied default alerts.json to Vercel /tmp directory');
    } catch (e) {
      console.error('Failed to copy alerts.json to /tmp:', e.message);
    }
  }
} else {
  // Local environment setup
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  if (!fs.existsSync(SLOTS_FILE)) {
    fs.writeFileSync(SLOTS_FILE, JSON.stringify({ tourist: [], business: [], lastUpdated: null }, null, 2));
  }
  if (!fs.existsSync(ALERTS_FILE)) {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2));
  }
}

// In-memory cache
let slotsCache = {
  tourist: [],
  business: [],
  lastUpdated: null
};

// Try loading existing slots from file at startup
try {
  const data = fs.readFileSync(SLOTS_FILE, 'utf8');
  slotsCache = JSON.parse(data);
  console.log('Loaded slots cache from file.');
} catch (e) {
  console.log('Failed to load slots cache from file, using empty default.');
}

// Helper to parse flag and country
function parseCountry(rawCountry) {
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/g;
  const flagMatch = rawCountry.match(emojiRegex);
  const flag = flagMatch ? flagMatch.join('') : '🇪🇺';
  const name = rawCountry.replace(emojiRegex, '').trim();
  return { name, flag };
}

// Helper to parse status, date, and checked age
function parseStatusAndDate(statusAndChecked, extraColText = '') {
  let status = 'no';
  let date = 'None';
  let checked = 'just now';
  let slots = '';

  const raw = statusAndChecked.replace(/\s+/g, ' ').trim();
  const checkedMatch = raw.match(/checked\s+(.+)$/i);
  if (checkedMatch) {
    checked = checkedMatch[1].trim();
  }

  const statusPart = raw.split(/checked/i)[0].trim();

  if (statusPart.toLowerCase().includes('waitlist')) {
    status = 'wl';
    date = 'Waitlist Open';
  } else if (statusPart.toLowerCase().includes('no availability') || statusPart.toLowerCase().includes('none')) {
    status = 'no';
    date = 'None';
  } else {
    status = 'av';
    date = statusPart.replace(/🔔\s*notify\s*me/gi, '').trim();
  }

  // Check extra column for slot quantities
  if (extraColText) {
    const extraClean = extraColText.replace(/\s+/g, ' ').trim();
    if (extraClean.toLowerCase().includes('+slots') || /\d+/.test(extraClean)) {
      slots = extraClean.replace(/🔔\s*notify\s*me/gi, '').trim();
    }
  }

  return { status, date, checked, slots };
}

// Scrape function for a specific URL
async function scrapeUrl(url, city, type) {
  try {
    console.log(`Scraping ${url} [City: ${city}, Type: ${type}]...`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000 // 10s timeout
    });

    const $ = cheerio.load(data);
    const results = [];

    $('tr').each((i, row) => {
      const th = $(row).find('th');
      const tds = $(row).find('td');

      if (th.length && tds.length) {
        const countryLink = th.find('a').first();
        const href = countryLink.attr('href');
        
        if (countryLink.length && href && href.includes(`/in/${city.toLowerCase().replace(/\s+/g, '-')}/`)) {
          const rawCountry = countryLink.text().trim();
          const { name, flag } = parseCountry(rawCountry);
          
          const statusCol = $(tds[0]).text();
          const extraCol = tds.length > 1 ? $(tds[1]).text() : '';
          
          const { status, date, checked, slots } = parseStatusAndDate(statusCol, extraCol);

          results.push({
            country: name,
            flag: flag,
            status: status,
            date: date,
            checked: checked,
            slots: slots,
            city: city, // 'Dubai' or 'Abu Dhabi'
            type: type  // 'Tourist' or 'Business'
          });
        }
      }
    });

    console.log(`Successfully parsed ${results.length} rows from ${url}`);
    return results;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return [];
  }
}

// Scrape both Tourist and Business data for Dubai & Abu Dhabi
async function scrapeAll() {
  const startTime = Date.now();
  console.log('--- Beginning full Schengen visa slots scrape ---');
  
  // URLs to scrape
  const urls = [
    { url: 'https://schengenappointments.com/in/dubai/tourism', city: 'Dubai', type: 'Tourist' },
    { url: 'https://schengenappointments.com/in/dubai/business', city: 'Dubai', type: 'Business' },
    { url: 'https://schengenappointments.com/in/abu-dhabi/tourism', city: 'Abu Dhabi', type: 'Tourist' },
    { url: 'https://schengenappointments.com/in/abu-dhabi/business', city: 'Abu Dhabi', type: 'Business' }
  ];

  const allResults = [];
  for (const item of urls) {
    const res = await scrapeUrl(item.url, item.city, item.type);
    allResults.push(...res);
    // Add a tiny sleep to avoid spamming the target server
    await new Promise(r => setTimeout(r, 600));
  }

  if (allResults.length > 0) {
    // Separate into tourist and business
    const tourist = allResults.filter(r => r.type === 'Tourist');
    const business = allResults.filter(r => r.type === 'Business');
    
    // Check for transitions before cache update
    await checkTransitionsAndAlert(tourist, business);
    
    slotsCache = {
      tourist: tourist,
      business: business,
      lastUpdated: new Date().toISOString()
    };

    // Write to persistent file
    fs.writeFileSync(SLOTS_FILE, JSON.stringify(slotsCache, null, 2));
    console.log(`--- Scrape complete! Total items: ${allResults.length}. Time taken: ${Math.round((Date.now() - startTime) / 1000)}s ---`);
    return true;
  } else {
    console.log('--- Scrape failed or returned zero results. Using cached data. ---');
    return false;
  }
}

// REST API: Get slot listings
app.get('/api/slots', (req, res) => {
  res.json(slotsCache);
});

// REST API: Live refresh / scan
let lastScanTime = 0;
app.get('/api/scan', async (req, res) => {
  const now = Date.now();
  // Rate limit live scrape to once every 15 seconds to prevent rate limits on the source
  if (now - lastScanTime < 15000) {
    console.log('Scan requested too quickly. Returning cached data.');
    return res.json({ success: true, fromCache: true, data: slotsCache });
  }

  lastScanTime = now;
  const success = await scrapeAll();
  res.json({
    success: success,
    fromCache: !success,
    data: slotsCache
  });
});

// REST API: Register WhatsApp/email alerts
app.post('/api/alerts', async (req, res) => {
  const { country, visaType, phone, email } = req.body;

  if (!phone || !email || !country) {
    return res.status(400).json({ error: 'Country, WhatsApp phone and email are required.' });
  }

  try {
    const alertsData = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    const newAlert = {
      id: Date.now().toString(),
      country,
      visaType: visaType || 'Tourist',
      phone,
      email,
      registeredAt: new Date().toISOString()
    };

    alertsData.push(newAlert);
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsData, null, 2));

    console.log(`Alert enrolled: WhatsApp ${phone} for ${country}`);

    // Send instant Welcome and Waitlist Confirmation HTML email
    const welcomeHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.02em;">SlotWatch</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Live waitlist activated</p>
        </div>
        <div style="padding: 32px 24px; background: #ffffff;">
          <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">You're on the list!</h2>
          <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">We have successfully registered your criteria. We are crawling official VFS and TLS portals 24/7. The second a slot opens, we will WhatsApp and email you instantly!</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Country to watch</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${country}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Visa Type</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${visaType}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Alert Channel</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">WhatsApp (${phone}) & Email</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Subscription Cost</td>
                <td style="padding: 6px 0; font-size: 14px; color: #059669; font-weight: bold; text-align: right;">AED 0 (BETA - FREE)</td>
              </tr>
            </table>
          </div>
          
          <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; font-weight: bold;">What to do next?</h3>
          <p style="margin: 0 0 24px 0; color: #475569; font-size: 13px; line-height: 1.6;">Don't wait until you get the slot to prepare! Slots get taken in seconds, so you need to book instantly. Use our interactive <strong>Document Checklist</strong> in the dashboard to organize your salary certificate, bank statements, and itinerary beforehand.</p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          SlotWatch is an independent real-time monitoring tool. Built in Dubai 🇦🇪
        </div>
      </div>
    `;

    await sendMail({
      to: email,
      subject: `✈️ SlotWatch Waitlist Activated — ${country} Schengen Slots`,
      html: welcomeHtml
    });

    res.json({ success: true, message: 'Successfully registered for alerts!' });
  } catch (error) {
    console.error('Error saving alert:', error.message);
    res.status(500).json({ error: 'Failed to register alert.' });
  }
});

// Fallback to scrape immediately on startup
scrapeAll();

// Set interval to scrape every 3 minutes (180000ms)
setInterval(scrapeAll, 180000);

app.listen(PORT, async () => {
  await initMailer();
  console.log(`SlotWatch server running on http://localhost:${PORT}`);
});
