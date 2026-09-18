// server.js - bluedotpay बैक-एंड इंजन
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🗄️ डेटाबेस कनेक्शन (MongoDB)
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('bluedotpay डेटाबेस सफलतापूर्वक कनेक्ट हो गया है।'))
  .catch(err => console.error('डेटाबेस कनेक्शन में गड़बड़:', err));

// 📝 डेटाबेस स्कीमा (Database Models)
const UserSchema = new mongoose.Schema({
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const RequestSchema = new mongoose.Schema({
    mobile: String,
    usdtAmount: Number,
    inrAmount: Number,
    paymentMethod: String,
    bankDetails: {
        accountNumber: String,
        ifsc: String,
        holderName: String
    },
    digitalRupeeQrUrl: String, 
    txScreenshotUrl: String,   
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
    liveUsdtRate: { type: Number, default: 92.50 },
    trc20Address: { type: String, default: 'TYuR1234xxxxxxxxxTRC20AddressXXXXXXXX' },
    bep20Address: { type: String, default: '0x71C765xxxxxxxxxxBEP20AddressXXXXXXXX' }
});

const User = mongoose.model('User', UserSchema);
const TransactionRequest = mongoose.model('TransactionRequest', RequestSchema);
const Config = mongoose.model('Config', ConfigSchema);

// 🚀 एपीआई राउट्स (API Routes)
// एडमिन पोर्टल खोलने के लिए रूट
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// कस्टमर लॉगिन (मुख्य पेज) खोलने के लिए रूट
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/config', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) config = await Config.create({});
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'कॉन्फ़िगरेशन लोड करने में त्रुटि' });
    }
});

app.post('/api/admin/update-config', async (req, res) => {
    const { creditLineKey, newRate, trc20, bep20 } = req.body;
    
    if (creditLineKey !== process.env.CREDIT_LINE_KEY) {
        return res.status(403).json({ error: 'एक्सेस डिनाइड: गलत क्रेडिट लाइन चाबी!' });
    }

    try {
        let config = await Config.findOne();
        if (!config) config = new Config();

        if (newRate) config.liveUsdtRate = newRate;
        if (trc20) config.trc20Address = trc20;
        if (bep20) config.bep20Address = bep20;

        await config.save();
        res.json({ message: 'bluedotpay सेटिंग्स सफलतापूर्वक अपडेट हो गईं!', config });
    } catch (err) {
        res.status(500).json({ error: 'अपडेट करने में विफलता' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { mobile, password } = req.body;
    try {
        const existingUser = await User.findOne({ mobile });
        if (existingUser) return res.status(400).json({ error: 'यह मोबाइल नंबर पहले से रजिस्टर्ड है।' });

        const newUser = new User({ mobile, password });
        await newUser.save();
        res.json({ message: 'रजिस्ट्रेशन सफल रहा!' });
    } catch (err) {
        res.status(500).json({ error: 'रजिस्ट्रेशन फेल हो गया' });
    }
});

app.post('/api/transactions/submit', async (req, res) => {
    const { mobile, usdtAmount, inrAmount, paymentMethod, bankDetails, digitalRupeeQrUrl, txScreenshotUrl } = req.body;
    try {
        const newRequest = new TransactionRequest({
            mobile, usdtAmount, inrAmount, paymentMethod, bankDetails, digitalRupeeQrUrl, txScreenshotUrl
        });
        await newRequest.save();
        res.json({ message: 'आपकी रिक्वेस्ट bluedotpay पर सबमिट हो गई है!' });
    } catch (err) {
        res.status(500).json({ error: 'रिक्वेस्ट सबमिट करने में गड़बड़' });
    }
});

app.post('/api/admin/requests', async (req, res) => {
    const { creditLineKey } = req.body;
    if (creditLineKey !== process.env.CREDIT_LINE_KEY) {
        return res.status(403).json({ error: 'अनाधिकृत एक्सेस!' });
    }
    try {
        const requests = await TransactionRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'डेटा लोड करने में असमर्थ' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`bluedotpay सर्वर पोर्ट ${PORT} पर एक्टिव है।`));
// १. एडमिन पेज का स्पष्ट रास्ता
app.get('/admin.html', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// २. कस्टमर पेज का rasta
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
