<?php
declare(strict_types=1);

namespace Archerries;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

final class Mailer
{
    public static function send(string $to, string $subject, string $htmlBody, ?string $altBody = null): void
    {
        $cfg = require __DIR__ . '/../config.php';
        $m = $cfg['mail'];

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $m['host'];
        $mail->Port       = $m['port'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $m['username'];
        $mail->Password   = $m['password'];
        $mail->SMTPSecure = $m['encryption'] === 'ssl'
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->CharSet    = 'UTF-8';
        $mail->SMTPDebug  = SMTP::DEBUG_OFF;

        $mail->setFrom($m['from_email'], $m['from_name']);
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody ?? strip_tags($htmlBody);

        $mail->send();
    }
}
