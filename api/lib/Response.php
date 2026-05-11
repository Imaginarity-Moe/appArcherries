<?php
declare(strict_types=1);

function res_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function res_error(string $message, int $status = 400, array $extra = []): never
{
    res_json(array_merge(['error' => $message], $extra), $status);
}
