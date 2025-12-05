<?php

declare(strict_types=1);

/**
 * DataImport - A class for importing and processing CSV data with array_walk/array_map style callbacks.
 *
 * @example
 * // Basic usage with map
 * $import = DataImport::fromFile('data.csv');
 * $users = $import->map(fn($row) => new User($row['name'], $row['email']));
 *
 * // Using walk for side effects
 * $import->walk(function($row, $index) {
 *     echo "Processing row $index: {$row['name']}\n";
 * });
 *
 * // Chaining with filter
 * $activeUsers = $import
 *     ->filter(fn($row) => $row['status'] === 'active')
 *     ->map(fn($row) => new User($row));
 */
class DataImport
{
    private string $delimiter = ',';
    private string $enclosure = '"';
    private string $escape = '\\';
    private bool $hasHeader = true;
    private array $headers = [];
    private array $rows = [];
    private ?string $filePath = null;

    /**
     * Create a new DataImport instance from a file path.
     */
    public static function fromFile(string $filePath): self
    {
        $instance = new self();
        $instance->filePath = $filePath;
        $instance->load();
        return $instance;
    }

    /**
     * Create a new DataImport instance from a string.
     */
    public static function fromString(string $content): self
    {
        $instance = new self();
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $content);
        rewind($stream);
        $instance->loadFromStream($stream);
        fclose($stream);
        return $instance;
    }

    /**
     * Create a new DataImport instance from a stream resource.
     *
     * @param resource $stream
     */
    public static function fromStream($stream): self
    {
        $instance = new self();
        $instance->loadFromStream($stream);
        return $instance;
    }

    /**
     * Create a new DataImport instance from an array (for testing or chaining).
     */
    public static function fromArray(array $rows, array $headers = []): self
    {
        $instance = new self();
        $instance->headers = $headers;
        $instance->rows = $rows;
        return $instance;
    }

    /**
     * Set the CSV delimiter character.
     */
    public function setDelimiter(string $delimiter): self
    {
        $this->delimiter = $delimiter;
        return $this;
    }

    /**
     * Set the CSV enclosure character.
     */
    public function setEnclosure(string $enclosure): self
    {
        $this->enclosure = $enclosure;
        return $this;
    }

    /**
     * Set the CSV escape character.
     */
    public function setEscape(string $escape): self
    {
        $this->escape = $escape;
        return $this;
    }

    /**
     * Specify whether the CSV has a header row.
     */
    public function setHasHeader(bool $hasHeader): self
    {
        $this->hasHeader = $hasHeader;
        return $this;
    }

    /**
     * Manually set headers (useful when CSV has no header row).
     */
    public function setHeaders(array $headers): self
    {
        $this->headers = $headers;
        return $this;
    }

    /**
     * Get the headers.
     */
    public function getHeaders(): array
    {
        return $this->headers;
    }

    /**
     * Get all rows.
     */
    public function getRows(): array
    {
        return $this->rows;
    }

    /**
     * Get the total number of rows.
     */
    public function count(): int
    {
        return count($this->rows);
    }

    /**
     * Process each row with a callback (like array_walk).
     * The callback receives the row and its index.
     * This method is used for side effects and does not modify the data.
     *
     * @param callable $callback function(array $row, int $index): void
     */
    public function walk(callable $callback): self
    {
        foreach ($this->rows as $index => $row) {
            $callback($row, $index);
        }
        return $this;
    }

    /**
     * Transform each row with a callback and return the results (like array_map).
     * The callback receives the row and its index.
     *
     * @param callable $callback function(array $row, int $index): mixed
     * @return array The transformed data
     */
    public function map(callable $callback): array
    {
        $results = [];
        foreach ($this->rows as $index => $row) {
            $results[] = $callback($row, $index);
        }
        return $results;
    }

    /**
     * Transform each row and return a new DataImport instance.
     * Useful for chaining operations.
     *
     * @param callable $callback function(array $row, int $index): array
     */
    public function mapToImport(callable $callback): self
    {
        $rows = [];
        foreach ($this->rows as $index => $row) {
            $rows[] = $callback($row, $index);
        }
        return self::fromArray($rows, $this->headers);
    }

    /**
     * Filter rows based on a callback.
     *
     * @param callable $callback function(array $row, int $index): bool
     */
    public function filter(callable $callback): self
    {
        $rows = [];
        foreach ($this->rows as $index => $row) {
            if ($callback($row, $index)) {
                $rows[] = $row;
            }
        }
        return self::fromArray($rows, $this->headers);
    }

    /**
     * Reduce the rows to a single value (like array_reduce).
     *
     * @param callable $callback function(mixed $carry, array $row, int $index): mixed
     * @param mixed $initial Initial value
     * @return mixed The final reduced value
     */
    public function reduce(callable $callback, mixed $initial = null): mixed
    {
        $carry = $initial;
        foreach ($this->rows as $index => $row) {
            $carry = $callback($carry, $row, $index);
        }
        return $carry;
    }

    /**
     * Get the first row or null if empty.
     */
    public function first(): ?array
    {
        return $this->rows[0] ?? null;
    }

    /**
     * Get the last row or null if empty.
     */
    public function last(): ?array
    {
        if (empty($this->rows)) {
            return null;
        }
        return $this->rows[count($this->rows) - 1];
    }

    /**
     * Get a specific row by index.
     */
    public function get(int $index): ?array
    {
        return $this->rows[$index] ?? null;
    }

    /**
     * Take the first n rows.
     */
    public function take(int $count): self
    {
        return self::fromArray(array_slice($this->rows, 0, $count), $this->headers);
    }

    /**
     * Skip the first n rows.
     */
    public function skip(int $count): self
    {
        return self::fromArray(array_slice($this->rows, $count), $this->headers);
    }

    /**
     * Chunk the rows into smaller arrays.
     *
     * @param int $size The size of each chunk
     * @return array Array of DataImport instances
     */
    public function chunk(int $size): array
    {
        $chunks = array_chunk($this->rows, $size);
        return array_map(fn($chunk) => self::fromArray($chunk, $this->headers), $chunks);
    }

    /**
     * Extract a single column from all rows.
     *
     * @param string|int $column The column name or index
     */
    public function pluck(string|int $column): array
    {
        return array_map(fn($row) => $row[$column] ?? null, $this->rows);
    }

    /**
     * Check if any row matches the callback condition.
     */
    public function any(callable $callback): bool
    {
        foreach ($this->rows as $index => $row) {
            if ($callback($row, $index)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if all rows match the callback condition.
     */
    public function all(callable $callback): bool
    {
        foreach ($this->rows as $index => $row) {
            if (!$callback($row, $index)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find the first row matching the callback.
     */
    public function find(callable $callback): ?array
    {
        foreach ($this->rows as $index => $row) {
            if ($callback($row, $index)) {
                return $row;
            }
        }
        return null;
    }

    /**
     * Group rows by a column value.
     *
     * @param string|int $column The column to group by
     * @return array Associative array of DataImport instances keyed by column value
     */
    public function groupBy(string|int $column): array
    {
        $groups = [];
        foreach ($this->rows as $row) {
            $key = $row[$column] ?? '';
            if (!isset($groups[$key])) {
                $groups[$key] = [];
            }
            $groups[$key][] = $row;
        }
        
        return array_map(fn($rows) => self::fromArray($rows, $this->headers), $groups);
    }

    /**
     * Create an iterator for memory-efficient processing of large files.
     * This re-reads the file and yields one row at a time.
     *
     * @return \Generator
     */
    public function each(): \Generator
    {
        foreach ($this->rows as $index => $row) {
            yield $index => $row;
        }
    }

    /**
     * Process a file row-by-row without loading everything into memory.
     * Useful for very large files.
     *
     * @param string $filePath Path to the CSV file
     * @param callable $callback function(array $row, int $index): void
     */
    public static function stream(string $filePath, callable $callback): void
    {
        $instance = new self();
        $handle = fopen($filePath, 'r');
        
        if ($handle === false) {
            throw new \RuntimeException("Unable to open file: {$filePath}");
        }

        $index = 0;
        $headers = [];

        while (($data = fgetcsv($handle, 0, $instance->delimiter, $instance->enclosure, $instance->escape)) !== false) {
            if ($instance->hasHeader && empty($headers)) {
                $headers = $data;
                continue;
            }

            $row = $instance->hasHeader ? array_combine($headers, $data) : $data;
            $callback($row, $index);
            $index++;
        }

        fclose($handle);
    }

    /**
     * Reload the data from the file.
     */
    public function reload(): self
    {
        if ($this->filePath !== null) {
            $this->load();
        }
        return $this;
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return $this->rows;
    }

    /**
     * Load data from the file.
     */
    private function load(): void
    {
        if (!file_exists($this->filePath)) {
            throw new \RuntimeException("File not found: {$this->filePath}");
        }

        $handle = fopen($this->filePath, 'r');
        if ($handle === false) {
            throw new \RuntimeException("Unable to open file: {$this->filePath}");
        }

        $this->loadFromStream($handle);
        fclose($handle);
    }

    /**
     * Load data from a stream resource.
     *
     * @param resource $stream
     */
    private function loadFromStream($stream): void
    {
        $this->rows = [];
        $this->headers = [];

        while (($data = fgetcsv($stream, 0, $this->delimiter, $this->enclosure, $this->escape)) !== false) {
            if ($data === [null]) {
                continue; // Skip empty lines
            }

            if ($this->hasHeader && empty($this->headers)) {
                $this->headers = $data;
                continue;
            }

            if ($this->hasHeader) {
                // Combine headers with data, padding if necessary
                $data = array_pad($data, count($this->headers), null);
                $row = array_combine($this->headers, array_slice($data, 0, count($this->headers)));
            } else {
                $row = $data;
            }

            $this->rows[] = $row;
        }
    }
}
