const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const MLModelTrainer = require('./ml-trainer');

const aliases = { 
  id: ['firid', 'caseid', 'kgid', 'crimeno'], 
  district: ['district', 'districtname'], 
  offence: ['crimetype', 'crimecategory', 'crimegroupname', 'crimeheadname', 'offence'], 
  status: ['crimestatus', 'investigationstatus', 'status', 'firstage'], 
  risk: ['risklevel', 'risk'], 
  date: ['date', 'firdate', 'year', 'firyear'], 
  policeStation: ['policestation', 'unitname'], 
  latitude: ['latitude', 'lat'], 
  longitude: ['longitude', 'lng', 'long'], 
  officer: ['officerassigned', 'ioname'],
  severity: ['severity'], 
  evidenceCount: ['evidencecount'], 
  witnessCount: ['witnesscount']
};

const canonical = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(row, name) { 
  const keys = Object.keys(row); 
  const key = keys.find((item) => aliases[name].includes(canonical(item))); 
  return key ? String(row[key] || '').trim() : ''; 
}

function normaliseRecord(row, index) {
  const id = pick(row, 'id'); 
  const district = pick(row, 'district'); 
  const offence = pick(row, 'offence');
  if (!id || !district || !offence) return { error: 'FIR/Case ID, District, and Crime Type/Category are required.' };
  
  const statusValue = pick(row, 'status'); 
  const severity = pick(row, 'severity');
  
  return { 
    record: { 
      id, district, offence, 
      suspect: String(row.Suspect_Name || row.suspect || 'Not provided').trim(), 
      vehicle: String(row.Vehicle_Number || row.vehicle || 'Not provided').trim(), 
      phone: String(row.Phone_Number || row.phone || 'Not provided').trim(), 
      risk: pick(row, 'risk') || (/high|critical/i.test(severity) ? 'High' : 'Medium'), 
      status: /closed|solved|disposed/i.test(statusValue) ? 'Closed' : 'Open', 
      summary: `${offence} reported in ${district}.`, 
      date: pick(row, 'date'), 
      policeStation: pick(row, 'policeStation'), 
      officer: pick(row, 'officer'), 
      severity: severity || 'Unknown', 
      latitude: Number(pick(row, 'latitude')) || null, 
      longitude: Number(pick(row, 'longitude')) || null, 
      evidenceCount: Number(pick(row, 'evidenceCount')) || 0, 
      witnessCount: Number(pick(row, 'witnessCount')) || 0, 
      sourceRow: index + 2 
    } 
  };
}

const csvFile = path.join(__dirname, 'training_dataset.csv');
const rows = [];

fs.createReadStream(csvFile)
  .pipe(csvParser())
  .on('data', (row) => rows.push(row))
  .on('end', async () => {
    console.log(`Parsed ${rows.length} rows from CSV`);
    
    const validCases = [];
    const seen = new Set();
    
    rows.forEach((row, index) => {
      const parsed = normaliseRecord(row, index);
      if (!parsed.error && !seen.has(parsed.record.id)) {
        seen.add(parsed.record.id);
        validCases.push(parsed.record);
      }
    });
    
    console.log(`Normalized into ${validCases.length} valid cases`);
    
    const trainer = new MLModelTrainer();
    console.log('Starting ML training...');
    
    // Train for 50 epochs as per server default
    const result = await trainer.trainModel(validCases, 50);
    
    console.log(result);
    
    // Let's also update data.json with some of these cases so the dashboard shows the real data
    try {
      const dataPath = path.join(__dirname, 'data.json');
      let backendData = {};
      if (fs.existsSync(dataPath)) {
        backendData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
      
      backendData.cases = validCases.slice(0, 500); // Save a sample to data.json
      
      // Basic analytics refresh logic matching server.js
      const groups = backendData.cases.reduce((all, item) => { (all[item.district] ||= []).push(item); return all; }, {});
      const districts = Object.entries(groups).map(([name, items]) => ({ 
        name, cases: items.length, 
        solved: Math.round((items.filter((item) => item.status === 'Closed').length / items.length) * 100) || 0, 
        hotspot: Math.round((items.filter((item) => item.risk === 'High').length / items.length) * 70 + Math.min(30, items.length)), 
        growth: 0 
      })).sort((a, b) => b.cases - a.cases);
      
      backendData.districts = districts;
      backendData.hotspots = districts.map((item, index) => ({ 
        district: item.name, 
        x: `${18 + (index * 23) % 66}%`, 
        y: `${20 + (index * 19) % 62}%`, 
        risk: item.hotspot >= 70 ? 'high' : item.hotspot >= 40 ? 'medium' : 'low', 
        score: item.hotspot 
      }));
      
      fs.writeFileSync(dataPath, JSON.stringify(backendData, null, 2), 'utf8');
      console.log('Updated data.json with real case data.');
    } catch (err) {
      console.error('Error updating data.json:', err.message);
    }
  });
