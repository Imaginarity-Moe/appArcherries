<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

function send_mail(string $to, string $subject, string $htmlBody, ?string $altBody = null): bool
{
    $m = config()['mail'];
    if (!$m['host'] || !$m['username'] || !$m['password']) {
        error_log('[mailer] SMTP nicht vollständig konfiguriert');
        return false;
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $m['host'];
        $mail->Port       = $m['port'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $m['username'];
        $mail->Password   = $m['password'];
        $mail->SMTPSecure = strtolower((string)$m['encryption']) === 'ssl'
            ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->CharSet    = 'UTF-8';
        $mail->Encoding   = 'base64';

        // From IMMER auf MAIL_USERNAME (sonst verwerfen Gmail/Outlook).
        // Wunsch-Absender wandert in Reply-To.
        $mail->setFrom($m['username'], (string)$m['from_name']);
        if ($m['from_email'] && strcasecmp($m['username'], (string)$m['from_email']) !== 0) {
            $mail->addReplyTo($m['from_email'], (string)$m['from_name']);
        }

        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody ?? strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody) ?? $htmlBody);

        return $mail->send();
    } catch (Throwable $e) {
        error_log('[mailer] send failed: ' . $e->getMessage() . ' — ErrorInfo: ' . ($mail->ErrorInfo ?? ''));
        return false;
    }
}
