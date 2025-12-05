# DataImport

A PHP class for importing and processing CSV data with `array_walk` and `array_map` style callbacks.

## Installation

Simply include the `src/DataImport.php` file in your project:

```php
require_once 'src/DataImport.php';
```

## Quick Start

```php
// Import from a file
$import = DataImport::fromFile('users.csv');

// Process each row with walk (like array_walk)
$import->walk(function($row, $index) {
    echo "Processing: {$row['name']}\n";
});

// Transform rows with map (like array_map)
$users = $import->map(fn($row) => new User($row['name'], $row['email']));
```

## Creating an Import

```php
// From a file
$import = DataImport::fromFile('data.csv');

// From a string
$import = DataImport::fromString("name,email\nJohn,john@example.com");

// From a stream
$import = DataImport::fromStream(fopen('data.csv', 'r'));

// From an array (useful for testing or chaining)
$import = DataImport::fromArray([
    ['name' => 'John', 'email' => 'john@example.com'],
    ['name' => 'Jane', 'email' => 'jane@example.com'],
], ['name', 'email']);
```

## Processing Methods

### `walk(callable $callback): self`

Process each row for side effects (like `array_walk`). Returns `$this` for chaining.

```php
$import->walk(function($row, $index) {
    saveToDatabase($row);
    echo "Saved row $index\n";
});
```

### `map(callable $callback): array`

Transform each row and return results (like `array_map`).

```php
$names = $import->map(fn($row) => $row['name']);
// ['John', 'Jane', 'Bob']

$users = $import->map(fn($row, $index) => new User($row));
// [User, User, User]
```

### `filter(callable $callback): DataImport`

Filter rows based on a condition. Returns a new `DataImport` instance.

```php
$activeUsers = $import->filter(fn($row) => $row['status'] === 'active');
```

### `reduce(callable $callback, mixed $initial = null): mixed`

Reduce rows to a single value (like `array_reduce`).

```php
$totalAge = $import->reduce(fn($sum, $row) => $sum + $row['age'], 0);
```

## Chaining Operations

Methods that return `DataImport` can be chained:

```php
$activeEmails = $import
    ->filter(fn($row) => $row['status'] === 'active')
    ->filter(fn($row) => (int)$row['age'] >= 18)
    ->map(fn($row) => $row['email']);
```

## Collection Methods

### Accessing Data

```php
$import->getHeaders();    // Get column headers
$import->getRows();       // Get all rows
$import->count();         // Number of rows
$import->first();         // First row or null
$import->last();          // Last row or null
$import->get(5);          // Get row at index 5
$import->toArray();       // Get all rows as array
```

### Slicing

```php
$first10 = $import->take(10);     // First 10 rows
$rest = $import->skip(10);        // Skip first 10 rows
$chunks = $import->chunk(100);    // Split into arrays of 100
```

### Extracting

```php
$emails = $import->pluck('email');  // Extract single column
```

### Searching

```php
$import->any(fn($row) => $row['admin']);   // True if any match
$import->all(fn($row) => $row['verified']); // True if all match
$import->find(fn($row) => $row['id'] === 5); // First matching row
```

### Grouping

```php
$byStatus = $import->groupBy('status');
// ['active' => DataImport, 'inactive' => DataImport]

foreach ($byStatus as $status => $group) {
    echo "$status: {$group->count()} users\n";
}
```

## Memory-Efficient Processing

For large files, use the `stream()` static method to process rows one at a time:

```php
DataImport::stream('large-file.csv', function($row, $index) {
    // Process each row without loading entire file
    processRow($row);
});
```

Or use the `each()` generator:

```php
foreach ($import->each() as $index => $row) {
    processRow($row);
}
```

## Configuration

### CSV Format

```php
$import = (new DataImport())
    ->setDelimiter(';')      // Default: ','
    ->setEnclosure("'")      // Default: '"'
    ->setEscape('\\');       // Default: '\\'
```

### Headers

```php
// Disable automatic header detection
$import->setHasHeader(false);

// Set custom headers
$import->setHeaders(['col1', 'col2', 'col3']);
```

## Full Example

```php
require_once 'src/DataImport.php';

// Import user data
$import = DataImport::fromFile('users.csv');

// Get active adult users
$validUsers = $import
    ->filter(fn($row) => $row['status'] === 'active')
    ->filter(fn($row) => (int)$row['age'] >= 18);

// Calculate stats
$avgAge = $validUsers->reduce(fn($sum, $row) => $sum + $row['age'], 0) / $validUsers->count();
echo "Average age: $avgAge\n";

// Process each user
$validUsers->walk(function($row, $index) {
    echo "Processing user $index: {$row['name']}\n";
    // Save to database, send email, etc.
});

// Transform to objects
$userObjects = $validUsers->map(fn($row) => new User(
    name: $row['name'],
    email: $row['email'],
    age: (int)$row['age']
));
```

## Running Tests

```bash
php tests/DataImportTest.php
```

## Running Examples

```bash
php examples/example.php
```
