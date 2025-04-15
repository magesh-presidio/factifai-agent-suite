const { BedRockAgentFactory } = require('./dist/agent/BedRockAgentFactory');

// Simple test to verify agent creation works
async function testAgentCreation() {
  try {
    console.log('Creating agent...');
    const agent = await BedRockAgentFactory.createAgent();
    console.log('Agent created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating agent:', error);
    return false;
  }
}

// Run the test
testAgentCreation()
  .then(success => {
    console.log(`Test ${success ? 'passed' : 'failed'}`);
    process.exit(success ? 0 : 1);
  });
