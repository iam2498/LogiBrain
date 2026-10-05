import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:5000/api';
const output = [];
let bugIdCounter = 1;

function logBug(testName, steps, expected, actual, severity, endpoint, method, reqData, responseStatus, responseData, recommendedFix) {
  output.push({
    bugId: `BUG-${bugIdCounter++}`,
    testName,
    steps,
    expected,
    actual,
    severity,
    evidence: `Method: ${method} | Endpoint: ${endpoint}\nRequest: ${JSON.stringify(reqData)}\nStatus: ${responseStatus}\nResponse: ${JSON.stringify(responseData)}`,
    recommendedFix
  });
}

async function runTests() {
  console.log("Starting QA tests...");
  let ownerToken = null;
  let driverToken = null;
  let ownerId = null;
  let driverId = null;
  let truckId = null;
  let tripId = null;

  const ownerCreds = { identifier: 'owner@example.com', password: 'password123' };
  
  // Create an owner for testing if it doesn't exist
  try {
    const regRes = await axios.post(`${API_URL}/auth/register-owner`, {
      name: 'Test Owner',
      email: ownerCreds.identifier,
      phone: '9999999999',
      password: ownerCreds.password,
      businessName: 'Logi Test'
    });
  } catch (e) {
    // might exist already
  }

  // 1. Owner Login Valid
  try {
    const res = await axios.post(`${API_URL}/auth/login`, ownerCreds);
    ownerToken = res.data.data.accessToken;
    ownerId = res.data.data.user._id;
  } catch (e) {
    console.error("Owner login failed, cannot proceed with tests:", e.message);
    return;
  }

  // Create a driver for testing
  try {
    const dRes = await axios.post(`${API_URL}/drivers`, {
      name: 'Test Driver',
      email: 'driver@example.com',
      phone: '8888888888',
      password: 'password123',
      licenseNumber: 'DL123456',
      licenseExpiry: '2030-01-01'
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    driverId = dRes.data.data.user._id;
  } catch (e) {
    // driver might exist, let's login
  }

  const driverCreds = { identifier: 'driver@example.com', password: 'password123' };
  try {
    const res = await axios.post(`${API_URL}/auth/login`, driverCreds);
    driverToken = res.data.data.accessToken;
  } catch (e) {
    console.error("Driver login failed:", e.message);
    return;
  }

  // Privilege Escalation Tests
  
  // Can Driver create a truck?
  try {
    const res = await axios.post(`${API_URL}/trucks`, {
      registrationNumber: 'GJ01TEST' + Math.floor(Math.random() * 1000)
    }, { headers: { Authorization: `Bearer ${driverToken}` } });
    
    // If we reach here, driver created a truck!
    logBug(
      'Driver can create truck',
      '1. Login as driver. 2. POST /api/trucks',
      '403 Forbidden',
      `${res.status} OK`,
      'CRITICAL',
      '/api/trucks', 'POST', {}, res.status, res.data,
      'Add authorize("OWNER") middleware to POST /api/trucks'
    );
  } catch (e) {
    // Expected to fail with 403
    if (e.response.status !== 403) {
      logBug(
        'Driver create truck returns wrong error',
        'POST /api/trucks as driver',
        '403 Forbidden',
        `${e.response.status}`,
        'LOW',
        '/api/trucks', 'POST', {}, e.response.status, e.response.data,
        'Ensure standard 403 response'
      );
    }
  }

  // Can Driver get trucks?
  try {
    const res = await axios.get(`${API_URL}/trucks`, { headers: { Authorization: `Bearer ${driverToken}` } });
    logBug(
      'Driver can list all trucks',
      'GET /api/trucks as driver',
      '403 Forbidden',
      `${res.status} OK`,
      'HIGH',
      '/api/trucks', 'GET', {}, res.status, res.data,
      'Add authorize("OWNER") to GET /api/trucks'
    );
  } catch (e) {}

  // Can Driver delete a trip?
  try {
    const res = await axios.delete(`${API_URL}/trips/invalidid123`, { headers: { Authorization: `Bearer ${driverToken}` } });
    logBug(
      'Driver can delete trips',
      'DELETE /api/trips/:id as driver',
      '403 Forbidden',
      `${res.status}`,
      'CRITICAL',
      '/api/trips/:id', 'DELETE', {}, res.status, res.data,
      'Add authorize("OWNER") to DELETE /api/trips/:id'
    );
  } catch (e) {
    if (e.response.status !== 403) {
      if (e.response.status === 404 || e.response.status === 400 || e.response.status === 500) {
        logBug(
          'Driver can access delete trip route',
          'DELETE /api/trips/:id as driver',
          '403 Forbidden',
          `${e.response.status} returned instead of 403`,
          'CRITICAL',
          '/api/trips/:id', 'DELETE', {}, e.response.status, e.response.data,
          'Add authorize("OWNER") to DELETE /api/trips/:id'
        );
      }
    }
  }

  // Write findings
  fs.writeFileSync('c:\\Users\\digvi\\OneDrive\\Desktop\\CP2\\LogiBrain_v2\\scratch_qa_results.json', JSON.stringify(output, null, 2));
  console.log(`Tests finished. Found ${output.length} bugs.`);
}

runTests();
