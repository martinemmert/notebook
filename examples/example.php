<?php

require_once __DIR__ . '/../src/DataImport.php';

// Example CSV content
$csvContent = <<<CSV
name,email,status,age
John Doe,john@example.com,active,30
Jane Smith,jane@example.com,inactive,25
Bob Wilson,bob@example.com,active,35
Alice Brown,alice@example.com,active,28
CSV;

echo "=== DataImport Examples ===\n\n";

// Create import from string
$import = DataImport::fromString($csvContent);

echo "1. Basic info:\n";
echo "   Headers: " . implode(', ', $import->getHeaders()) . "\n";
echo "   Row count: " . $import->count() . "\n\n";

// Using walk (like array_walk) - for side effects
echo "2. Using walk() - process each row:\n";
$import->walk(function($row, $index) {
    echo "   Row $index: {$row['name']} ({$row['email']})\n";
});
echo "\n";

// Using map (like array_map) - transform data
echo "3. Using map() - transform rows:\n";
$names = $import->map(fn($row) => strtoupper($row['name']));
echo "   Uppercase names: " . implode(', ', $names) . "\n\n";

// Filter + map chain
echo "4. Using filter() + map() chain:\n";
$activeEmails = $import
    ->filter(fn($row) => $row['status'] === 'active')
    ->map(fn($row) => $row['email']);
echo "   Active user emails: " . implode(', ', $activeEmails) . "\n\n";

// Using reduce
echo "5. Using reduce() - calculate total age:\n";
$totalAge = $import->reduce(fn($sum, $row) => $sum + (int)$row['age'], 0);
echo "   Total age: $totalAge\n";
echo "   Average age: " . ($totalAge / $import->count()) . "\n\n";

// Using pluck
echo "6. Using pluck() - extract single column:\n";
$allNames = $import->pluck('name');
echo "   All names: " . implode(', ', $allNames) . "\n\n";

// Using find
echo "7. Using find() - find first matching row:\n";
$bob = $import->find(fn($row) => str_contains($row['name'], 'Bob'));
echo "   Found: " . print_r($bob, true) . "\n";

// Using groupBy
echo "8. Using groupBy() - group by status:\n";
$byStatus = $import->groupBy('status');
foreach ($byStatus as $status => $group) {
    echo "   $status: " . $group->count() . " users\n";
}
echo "\n";

// Using any/all
echo "9. Using any() and all():\n";
$hasInactive = $import->any(fn($row) => $row['status'] === 'inactive');
$allAdults = $import->all(fn($row) => (int)$row['age'] >= 18);
echo "   Has inactive users: " . ($hasInactive ? 'yes' : 'no') . "\n";
echo "   All are adults: " . ($allAdults ? 'yes' : 'no') . "\n\n";

// Using take/skip
echo "10. Using take() and skip():\n";
echo "    First 2 users: " . implode(', ', $import->take(2)->pluck('name')) . "\n";
echo "    Skip first 2: " . implode(', ', $import->skip(2)->pluck('name')) . "\n\n";

// Using chunk
echo "11. Using chunk() - process in batches:\n";
$chunks = $import->chunk(2);
foreach ($chunks as $i => $chunk) {
    echo "    Chunk $i: " . implode(', ', $chunk->pluck('name')) . "\n";
}
echo "\n";

// Iterator usage
echo "12. Using each() generator:\n";
foreach ($import->each() as $index => $row) {
    echo "    [$index] {$row['name']}\n";
}
echo "\n";

// Create from array
echo "13. Create from array:\n";
$fromArray = DataImport::fromArray([
    ['id' => 1, 'value' => 'one'],
    ['id' => 2, 'value' => 'two'],
], ['id', 'value']);
$fromArray->walk(fn($row) => print("    id={$row['id']}, value={$row['value']}\n"));

echo "\n=== Examples Complete ===\n";
