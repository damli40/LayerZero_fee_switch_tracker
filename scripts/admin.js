#!/usr/bin/env node

/**
 * Admin CLI Tool for Shadow Burn Dashboard
 * Usage: node scripts/admin.js [command]
 */

const readline = require('readline');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

async function checkStatus() {
  console.log('🔍 Checking database status...\n');

  try {
    const initStatus = await makeRequest('/api/admin/init');
    console.log('✅ Database Status:');
    console.log(`   Initialized: ${initStatus.initialized}`);

    if (initStatus.initialized) {
      const syncStatus = await makeRequest('/api/admin/sync');
      console.log(`\n📊 Last Sync:`);
      console.log(`   Date: ${syncStatus.lastSync?.last_sync_date || 'Never'}`);
      console.log(`   Status: ${syncStatus.lastSync?.status || 'Unknown'}`);
      console.log(`   Messages: ${syncStatus.lastSync?.messages_synced || 0}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function initDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question('⚠️  This will fetch all historical data from Dec 27, 2025. Continue? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('❌ Aborted');
    return;
  }

  console.log('\n🚀 Initializing database...');
  console.log('This may take several minutes...\n');

  try {
    const result = await makeRequest('/api/admin/init', { method: 'POST' });
    console.log('✅ Success!');
    console.log(`   Records: ${result.recordsInserted}`);
    console.log(`   Date Range: ${result.dateRange.start} to ${result.dateRange.end}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function syncData(options = {}) {
  console.log('🔄 Syncing new data...\n');

  try {
    const body = {};
    if (options.start && options.end) {
      body.startDate = options.start;
      body.endDate = options.end;
      console.log(`   Date Range: ${options.start} to ${options.end}`);
    }
    if (options.force) {
      body.force = true;
      console.log('   Mode: Force re-sync');
    }

    const result = await makeRequest('/api/admin/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log('\n✅ Sync complete!');
    console.log(`   Records: ${result.recordsInserted}`);
    console.log(`   Date Range: ${result.dateRange.start} to ${result.dateRange.end}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function showHelp() {
  console.log(`
LayerZero Shadow Burn Dashboard - Admin CLI

Usage: node scripts/admin.js [command] [options]

Commands:
  status              Check database and sync status
  init                Initialize database with historical data
  sync                Sync new data since last sync
  sync --force        Force re-sync all data
  sync --start YYYY-MM-DD --end YYYY-MM-DD    Sync specific date range
  help                Show this help message

Environment Variables:
  BASE_URL           API base URL (default: http://localhost:3000)

Examples:
  node scripts/admin.js status
  node scripts/admin.js init
  node scripts/admin.js sync
  node scripts/admin.js sync --start 2025-01-01 --end 2025-01-10
  node scripts/admin.js sync --force

Note: Make sure the development server is running before using this tool.
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

const options = {
  force: args.includes('--force'),
  start: args[args.indexOf('--start') + 1],
  end: args[args.indexOf('--end') + 1],
};

// Execute command
(async () => {
  switch (command) {
    case 'status':
      await checkStatus();
      break;
    case 'init':
      await initDatabase();
      break;
    case 'sync':
      await syncData(options);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command || '(none)'}`);
      console.log('Run "node scripts/admin.js help" for usage information');
      process.exit(1);
  }
})();
