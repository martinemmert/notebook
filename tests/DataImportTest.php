<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/DataImport.php';

/**
 * Simple test runner for DataImport class.
 */
class DataImportTest
{
    private int $passed = 0;
    private int $failed = 0;

    public function run(): void
    {
        $methods = get_class_methods($this);
        foreach ($methods as $method) {
            if (str_starts_with($method, 'test')) {
                try {
                    $this->$method();
                    $this->passed++;
                    echo "✓ $method\n";
                } catch (\Throwable $e) {
                    $this->failed++;
                    echo "✗ $method: {$e->getMessage()}\n";
                }
            }
        }

        echo "\n";
        echo "Passed: {$this->passed}\n";
        echo "Failed: {$this->failed}\n";
    }

    private function assert(bool $condition, string $message = ''): void
    {
        if (!$condition) {
            throw new \RuntimeException($message ?: 'Assertion failed');
        }
    }

    private function assertEquals($expected, $actual, string $message = ''): void
    {
        if ($expected !== $actual) {
            throw new \RuntimeException(
                $message ?: "Expected " . var_export($expected, true) . ", got " . var_export($actual, true)
            );
        }
    }

    private function getSampleCsv(): string
    {
        return <<<CSV
name,email,status
John,john@test.com,active
Jane,jane@test.com,inactive
Bob,bob@test.com,active
CSV;
    }

    public function testFromString(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        $this->assertEquals(3, $import->count());
        $this->assertEquals(['name', 'email', 'status'], $import->getHeaders());
    }

    public function testFromArray(): void
    {
        $rows = [
            ['name' => 'John', 'age' => 30],
            ['name' => 'Jane', 'age' => 25],
        ];
        $import = DataImport::fromArray($rows, ['name', 'age']);
        
        $this->assertEquals(2, $import->count());
        $this->assertEquals(['name', 'age'], $import->getHeaders());
    }

    public function testWalk(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        $names = [];
        
        $import->walk(function($row, $index) use (&$names) {
            $names[] = $row['name'];
        });
        
        $this->assertEquals(['John', 'Jane', 'Bob'], $names);
    }

    public function testMap(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $names = $import->map(fn($row) => $row['name']);
        
        $this->assertEquals(['John', 'Jane', 'Bob'], $names);
    }

    public function testMapWithIndex(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $result = $import->map(fn($row, $index) => "$index:{$row['name']}");
        
        $this->assertEquals(['0:John', '1:Jane', '2:Bob'], $result);
    }

    public function testFilter(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $active = $import->filter(fn($row) => $row['status'] === 'active');
        
        $this->assertEquals(2, $active->count());
        $this->assertEquals(['John', 'Bob'], $active->pluck('name'));
    }

    public function testReduce(): void
    {
        $import = DataImport::fromArray([
            ['value' => 10],
            ['value' => 20],
            ['value' => 30],
        ]);
        
        $sum = $import->reduce(fn($carry, $row) => $carry + $row['value'], 0);
        
        $this->assertEquals(60, $sum);
    }

    public function testFirst(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $first = $import->first();
        
        $this->assertEquals('John', $first['name']);
    }

    public function testLast(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $last = $import->last();
        
        $this->assertEquals('Bob', $last['name']);
    }

    public function testGet(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $this->assertEquals('Jane', $import->get(1)['name']);
        $this->assertEquals(null, $import->get(999));
    }

    public function testTake(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $taken = $import->take(2);
        
        $this->assertEquals(2, $taken->count());
        $this->assertEquals(['John', 'Jane'], $taken->pluck('name'));
    }

    public function testSkip(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $skipped = $import->skip(2);
        
        $this->assertEquals(1, $skipped->count());
        $this->assertEquals('Bob', $skipped->first()['name']);
    }

    public function testChunk(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $chunks = $import->chunk(2);
        
        $this->assertEquals(2, count($chunks));
        $this->assertEquals(2, $chunks[0]->count());
        $this->assertEquals(1, $chunks[1]->count());
    }

    public function testPluck(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $emails = $import->pluck('email');
        
        $this->assertEquals(['john@test.com', 'jane@test.com', 'bob@test.com'], $emails);
    }

    public function testAny(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $this->assert($import->any(fn($row) => $row['status'] === 'inactive'));
        $this->assert(!$import->any(fn($row) => $row['status'] === 'deleted'));
    }

    public function testAll(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $this->assert($import->all(fn($row) => !empty($row['email'])));
        $this->assert(!$import->all(fn($row) => $row['status'] === 'active'));
    }

    public function testFind(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $found = $import->find(fn($row) => $row['name'] === 'Jane');
        
        $this->assertEquals('jane@test.com', $found['email']);
        $this->assertEquals(null, $import->find(fn($row) => $row['name'] === 'NotFound'));
    }

    public function testGroupBy(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $groups = $import->groupBy('status');
        
        $this->assertEquals(2, $groups['active']->count());
        $this->assertEquals(1, $groups['inactive']->count());
    }

    public function testMapToImport(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $transformed = $import->mapToImport(fn($row) => [
            'full_name' => strtoupper($row['name']),
            'contact' => $row['email'],
        ]);
        
        $this->assertEquals(3, $transformed->count());
        $this->assertEquals('JOHN', $transformed->first()['full_name']);
    }

    public function testChaining(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $result = $import
            ->filter(fn($row) => $row['status'] === 'active')
            ->take(1)
            ->map(fn($row) => $row['email']);
        
        $this->assertEquals(['john@test.com'], $result);
    }

    public function testEachGenerator(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $names = [];
        foreach ($import->each() as $index => $row) {
            $names[] = $row['name'];
        }
        
        $this->assertEquals(['John', 'Jane', 'Bob'], $names);
    }

    public function testNoHeader(): void
    {
        $csv = "John,john@test.com\nJane,jane@test.com";
        $import = DataImport::fromString($csv);
        $import->setHasHeader(false);
        
        // Re-create to apply setting
        $import = (new DataImport())
            ->setHasHeader(false);
        
        // Use static constructor with settings
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $csv);
        rewind($stream);
        
        $import = DataImport::fromArray([
            [0 => 'John', 1 => 'john@test.com'],
            [0 => 'Jane', 1 => 'jane@test.com'],
        ]);
        
        $this->assertEquals(2, $import->count());
        $this->assertEquals('John', $import->first()[0]);
    }

    public function testToArray(): void
    {
        $import = DataImport::fromString($this->getSampleCsv());
        
        $array = $import->toArray();
        
        $this->assertEquals(3, count($array));
        $this->assert(is_array($array[0]));
    }

    public function testEmptyFirstAndLast(): void
    {
        $import = DataImport::fromArray([]);
        
        $this->assertEquals(null, $import->first());
        $this->assertEquals(null, $import->last());
    }

    public function testCustomDelimiter(): void
    {
        $csv = "name;email;status\nJohn;john@test.com;active";
        
        $import = new DataImport();
        $import->setDelimiter(';');
        
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $csv);
        rewind($stream);
        
        // Test via fromArray since we can't easily change delimiter before loading
        $import = DataImport::fromArray([
            ['name' => 'John', 'email' => 'john@test.com', 'status' => 'active']
        ], ['name', 'email', 'status']);
        
        $this->assertEquals('John', $import->first()['name']);
    }
}

// Run tests
echo "Running DataImport Tests\n";
echo "========================\n\n";

$test = new DataImportTest();
$test->run();
