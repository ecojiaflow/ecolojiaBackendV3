/**
 * TEST RAPIDE DIAGNOSTIC SPRINT 2
 * Vérifie les imports et classes de base
 */

console.log('🔍 === DIAGNOSTIC SPRINT 2 ===');

// Test 1: Vérification fichiers Sprint 1
console.log('\n📂 Test 1: Vérification fichiers existants...');

try {
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'src/scorers/food/novaClassifier.js',
    'src/scorers/food/additivesAnalyzer.js',
    'src/scorers/common/confidenceCalculator.js',
    'src/data/nova-rules.json',
    'src/data/additives-efsa.json'
  ];
  
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });
  
} catch (error) {
  console.log('   ❌ Erreur vérification fichiers:', error.message);
}

// Test 2: Vérification nouveaux fichiers Sprint 2
console.log('\n📂 Test 2: Vérification nouveaux fichiers Sprint 2...');

try {
  const fs = require('fs');
  
  const newFiles = [
    'src/data/nutri-score-tables.json',
    'src/data/glycemic-index-db.json',
    'src/scorers/food/nutriScorer.js',
    'src/scorers/food/glycemicEstimator.js'
  ];
  
  newFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });
  
} catch (error) {
  console.log('   ❌ Erreur vérification nouveaux fichiers:', error.message);
}

// Test 3: Test imports individuels
console.log('\n🔗 Test 3: Test imports individuels...');

// Test NovaClassifier
try {
  const NovaClassifier = require('./src/scorers/food/novaClassifier');
  console.log(`   ✅ NovaClassifier: ${typeof NovaClassifier === 'function' ? 'Constructor OK' : 'Type: ' + typeof NovaClassifier}`);
} catch (error) {
  console.log(`   ❌ NovaClassifier: ${error.message}`);
}

// Test AdditivesAnalyzer
try {
  const AdditivesAnalyzer = require('./src/scorers/food/additivesAnalyzer');
  console.log(`   ✅ AdditivesAnalyzer: ${typeof AdditivesAnalyzer === 'function' ? 'Constructor OK' : 'Type: ' + typeof AdditivesAnalyzer}`);
} catch (error) {
  console.log(`   ❌ AdditivesAnalyzer: ${error.message}`);
}

// Test NutriScorer (nouveau)
try {
  const NutriScorer = require('./src/scorers/food/nutriScorer');
  console.log(`   ✅ NutriScorer: ${typeof NutriScorer === 'function' ? 'Constructor OK' : 'Type: ' + typeof NutriScorer}`);
} catch (error) {
  console.log(`   ❌ NutriScorer: ${error.message}`);
}

// Test GlycemicEstimator (nouveau)
try {
  const GlycemicEstimator = require('./src/scorers/food/glycemicEstimator');
  console.log(`   ✅ GlycemicEstimator: ${typeof GlycemicEstimator === 'function' ? 'Constructor OK' : 'Type: ' + typeof GlycemicEstimator}`);
} catch (error) {
  console.log(`   ❌ GlycemicEstimator: ${error.message}`);
}

// Test 4: Test données JSON
console.log('\n📊 Test 4: Test chargement données JSON...');

try {
  const nutriTables = require('./src/data/nutri-score-tables.json');
  console.log(`   ✅ nutri-score-tables.json: ${Object.keys(nutriTables).length} sections`);
} catch (error) {
  console.log(`   ❌ nutri-score-tables.json: ${error.message}`);
}

try {
  const glycemicDB = require('./src/data/glycemic-index-db.json');
  console.log(`   ✅ glycemic-index-db.json: ${Object.keys(glycemicDB.categories || {}).length} catégories`);
} catch (error) {
  console.log(`   ❌ glycemic-index-db.json: ${error.message}`);
}

// Test 5: Test instanciation simple
console.log('\n🏗️ Test 5: Test instanciation simple...');

try {
  const NutriScorer = require('./src/scorers/food/nutriScorer');
  const nutriScorer = new NutriScorer();
  console.log('   ✅ NutriScorer instancié avec succès');
} catch (error) {
  console.log(`   ❌ Erreur instanciation NutriScorer: ${error.message}`);
}

try {
  const GlycemicEstimator = require('./src/scorers/food/glycemicEstimator');
  const glycemicEstimator = new GlycemicEstimator();
  console.log('   ✅ GlycemicEstimator instancié avec succès');
} catch (error) {
  console.log(`   ❌ Erreur instanciation GlycemicEstimator: ${error.message}`);
}

console.log('\n🎯 === FIN DIAGNOSTIC ===');
console.log('📝 Partage ces résultats pour diagnostic précis du problème !');