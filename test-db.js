const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const uri = envVars.MONGODB_URI;

const clientOptions = {
    serverApi: { version: '1', strict: true, deprecationErrors: true },
    family: 4,
    serverSelectionTimeoutMS: 5000 // 5s timeout
};

async function run() {
    try {
        console.log("Attempting to connect to:", uri.replace(/:([^@]+)@/, ':****@'));
        await mongoose.connect(uri, clientOptions);
        console.log("Connected successfully to MongoDB!");
        fs.writeFileSync('db_log.txt', 'Success: Connected to MongoDB');
        await mongoose.disconnect();
    } catch (err) {
        console.error("Connection failed:", err);
        fs.writeFileSync('db_log.txt', 'Error: ' + JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
}

run();
