<?php

namespace app\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Quotation;

class EmailController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // CORS
        $behaviors['cors'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['*'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
            ],
        ];
        
        return $behaviors;
    }

    /**
     * Send quotation email
     * POST /api/email/send-quotation
     */
    public function actionSendQuotation()
    {
        $request = Yii::$app->request;
        $data = json_decode($request->getRawBody(), true);

        $quotationId = $data['quotation_id'] ?? null;
        $recipientEmail = $data['email'] ?? null;
        $recipientName = $data['name'] ?? null;
        $subject = $data['subject'] ?? null;
        $message = $data['message'] ?? '';
        $ccEmails = $data['cc'] ?? [];
        $attachPdf = $data['attach_pdf'] ?? true;

        // Validation
        if (!$quotationId) {
            return ['success' => false, 'error' => 'Quotation ID is required'];
        }

        if (!$recipientEmail || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'error' => 'Valid email address is required'];
        }

        // Get quotation
        $quotation = Quotation::findOne($quotationId);
        if (!$quotation) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        // Default subject
        if (!$subject) {
            $subject = "Quotation {$quotation->quotation_number} from ABC Corrugation Industries";
        }

        // Build email body
        $emailBody = $this->buildEmailBody($quotation, $recipientName, $message);

        try {
            // Create email
            $mail = Yii::$app->mailer->compose()
                ->setFrom([Yii::$app->params['senderEmail'] => Yii::$app->params['senderName']])
                ->setTo($recipientEmail)
                ->setSubject($subject)
                ->setHtmlBody($emailBody);

            // Add CC
            if (!empty($ccEmails)) {
                $mail->setCc($ccEmails);
            }

            // Attach PDF (if enabled and file exists)
            if ($attachPdf) {
                $pdfPath = $this->generatePDF($quotation);
                if ($pdfPath && file_exists($pdfPath)) {
                    $mail->attach($pdfPath, [
                        'fileName' => "{$quotation->quotation_number}.pdf",
                        'contentType' => 'application/pdf',
                    ]);
                }
            }

            // Send email
            if ($mail->send()) {
                // Update quotation status
                if ($quotation->status === 'draft') {
                    $quotation->status = 'sent';
                    $quotation->save(false);
                }

                // Log email
                $this->logEmail($quotation->id, $recipientEmail, $subject);

                return [
                    'success' => true,
                    'message' => 'Email sent successfully',
                    'data' => [
                        'quotation_number' => $quotation->quotation_number,
                        'sent_to' => $recipientEmail,
                        'sent_at' => date('Y-m-d H:i:s'),
                    ],
                ];
            } else {
                return ['success' => false, 'error' => 'Failed to send email'];
            }
        } catch (\Exception $e) {
            Yii::error("Email sending failed: " . $e->getMessage());
            return ['success' => false, 'error' => 'Email sending failed: ' . $e->getMessage()];
        }
    }

    /**
     * Build email HTML body
     */
    private function buildEmailBody($quotation, $recipientName, $customMessage)
    {
        $companyName = 'ABC Corrugation Industries';
        $companyEmail = 'info@abccorrugation.com';
        $companyPhone = '+91 98765 43210';

        $greeting = $recipientName ? "Dear {$recipientName}," : "Dear Sir/Madam,";
        
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation {$quotation->quotation_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
        }
        .content {
            background: #f8fafc;
            padding: 25px;
            border: 1px solid #e2e8f0;
        }
        .quotation-box {
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .quotation-box h2 {
            color: #1e40af;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #64748b;
        }
        .info-value {
            font-weight: bold;
            color: #1e293b;
        }
        .total-row {
            background: #ecfdf5;
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
        }
        .total-row .info-value {
            color: #059669;
            font-size: 20px;
        }
        .message-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .cta-button {
            display: inline-block;
            background: #059669;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .cta-button:hover {
            background: #047857;
        }
        .footer {
            background: #1e293b;
            color: #94a3b8;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 14px;
        }
        .footer a {
            color: #60a5fa;
            text-decoration: none;
        }
        .validity-note {
            background: #fef2f2;
            color: #dc2626;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 {$companyName}</h1>
        <p>Quality Packaging Solutions</p>
    </div>
    
    <div class="content">
        <p>{$greeting}</p>
        
        <p>Thank you for your inquiry. Please find below the quotation details as requested.</p>
HTML;

        // Add custom message if provided
        if (!empty($customMessage)) {
            $html .= <<<HTML
        <div class="message-box">
            <strong>📝 Message:</strong><br>
            {$customMessage}
        </div>
HTML;
        }

        // Quotation details
        $formattedDate = date('d M Y', strtotime($quotation->quotation_date));
        $validUntil = date('d M Y', strtotime($quotation->valid_until));
        $formattedTotal = number_format($quotation->total_amount, 2);
        $itemsCount = count($quotation->items);

        $html .= <<<HTML
        <div class="quotation-box">
            <h2>📋 Quotation Details</h2>
            
            <div class="info-row">
                <span class="info-label">Quotation Number:</span>
                <span class="info-value">{$quotation->quotation_number}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">{$formattedDate}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Valid Until:</span>
                <span class="info-value">{$validUntil}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Items:</span>
                <span class="info-value">{$itemsCount} item(s)</span>
            </div>
            
            <div class="total-row">
                <div class="info-row" style="border: none;">
                    <span class="info-label" style="font-size: 16px;">Grand Total:</span>
                    <span class="info-value">₹{$formattedTotal}</span>
                </div>
            </div>
        </div>
        
        <div class="validity-note">
            ⏰ This quotation is valid until <strong>{$validUntil}</strong>
        </div>
        
        <p style="text-align: center;">
            <a href="#" class="cta-button">✓ Accept Quotation</a>
        </p>
        
        <p>The detailed quotation is attached as a PDF document for your reference.</p>
        
        <p>If you have any questions or need any modifications, please don't hesitate to contact us.</p>
        
        <p>
            Best Regards,<br>
            <strong>{$companyName}</strong><br>
            📞 {$companyPhone}<br>
            ✉️ {$companyEmail}
        </p>
    </div>
    
    <div class="footer">
        <p>
            {$companyName}<br>
            123, Industrial Area, GIDC, Ahmedabad - 382445, Gujarat<br>
            <a href="mailto:{$companyEmail}">{$companyEmail}</a> | 
            <a href="tel:{$companyPhone}">{$companyPhone}</a>
        </p>
        <p style="font-size: 12px; margin-top: 15px;">
            This email was sent regarding Quotation {$quotation->quotation_number}.<br>
            Please do not reply to this email directly.
        </p>
    </div>
</body>
</html>
HTML;

        return $html;
    }

    /**
     * Generate PDF for attachment
     */
    private function generatePDF($quotation)
    {
        // You can integrate with a PDF library like TCPDF or Dompdf
        // For now, return null (PDF will be generated on frontend)
        return null;
    }

    /**
     * Log email to database
     */
    private function logEmail($quotationId, $email, $subject)
    {
        // Log to database if needed
        Yii::info("Email sent for quotation {$quotationId} to {$email}");
    }

    /**
     * Get email templates
     * GET /api/email/templates
     */
    public function actionTemplates()
    {
        return [
            'success' => true,
            'data' => [
                [
                    'id' => 'quotation_new',
                    'name' => 'New Quotation',
                    'subject' => 'Quotation {{quotation_number}} from ABC Corrugation',
                    'body' => 'Please find attached the quotation as requested.',
                ],
                [
                    'id' => 'quotation_reminder',
                    'name' => 'Quotation Reminder',
                    'subject' => 'Reminder: Quotation {{quotation_number}} expires soon',
                    'body' => 'This is a reminder that your quotation will expire on {{valid_until}}.',
                ],
                [
                    'id' => 'quotation_followup',
                    'name' => 'Follow-up',
                    'subject' => 'Following up on Quotation {{quotation_number}}',
                    'body' => 'We wanted to follow up on the quotation we sent. Please let us know if you have any questions.',
                ],
            ],
        ];
    }
}