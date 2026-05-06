<?php

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

try {
    $pdo = db();
    $bankFilter = isset($_GET['bank']) && $_GET['bank'] !== '' ? trim((string) $_GET['bank']) : null;
    $periodFilter = isset($_GET['period']) && $_GET['period'] !== '' ? trim((string) $_GET['period']) : null;

    $periodStmt = $pdo->query(
        'SELECT id, label, published_at, valid_from, valid_to, notes
         FROM rate_periods
         WHERE is_current = 1
         ORDER BY published_at DESC, id DESC
         LIMIT 1'
    );
    $period = $periodStmt->fetch() ?: null;

    if ($periodFilter) {
        $periodLookup = $pdo->prepare(
            'SELECT id, label, published_at, valid_from, valid_to, notes
             FROM rate_periods
             WHERE label = :label OR CONCAT(quarter_year, "-Q", quarter_no) = :quarter_code
             ORDER BY published_at DESC, id DESC
             LIMIT 1'
        );
        $periodLookup->execute([
            'label' => $periodFilter,
            'quarter_code' => preg_replace('/\s+/', '', $periodFilter),
        ]);
        $found = $periodLookup->fetch();
        if ($found) {
            $period = $found;
        }
    }

    $where = 'WHERE rp.id = :period_id';
    if ($bankFilter) {
        $where .= ' AND b.slug = :bank_slug';
    }

    $sql = '
        SELECT
            b.id,
            b.name,
            b.slug,
            b.color,
            b.sort_order,
            rp.label AS period_label,
            rp.published_at,
            rir.rate_type,
            rir.annual_rate,
            rir.source_url,
            rir.note,
            rir.updated_at
        FROM bank_interest_rates rir
        INNER JOIN banks b ON b.id = rir.bank_id
        INNER JOIN rate_periods rp ON rp.id = rir.rate_period_id
        ' . $where . '
          AND rir.rate_type = :rate_type
        ORDER BY b.sort_order ASC, b.name ASC
    ';

    $rateStmt = $pdo->prepare($sql);
    $params = ['period_id' => $period['id'] ?? 0];
    $params['rate_type'] = 'MRR';
    if ($bankFilter) {
        $params['bank_slug'] = $bankFilter;
    }
    $rateStmt->execute($params);
    $banks = $rateStmt->fetchAll();

    if (!$period || !$banks) {
        echo json_encode([
            'success' => false,
            'message' => 'No rate data found.',
            'period' => $period,
            'banks' => [],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'success' => true,
        'period' => $period,
        'banks' => $banks,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $error->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
