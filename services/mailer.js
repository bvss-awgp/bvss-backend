var nodemailer = require('nodemailer');
var https = require('https');

var transporter = null;
var transporterInitialized = false;

var getTransporter = function () {
  if (transporterInitialized) {
    return transporter;
  }

  transporterInitialized = true;

  var user = process.env.SMTP_USER;
  var pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('Email transport not configured. Missing SMTP_USER or SMTP_PASS.');
    return null;
  }

  // Check if using alternative email service
  var smtpHost = process.env.SMTP_HOST;
  // If SMTP_HOST is not set or is a placeholder, default to Gmail
  if (!smtpHost || smtpHost.includes('yourprovider') || smtpHost.includes('example') || smtpHost.trim() === '') {
    smtpHost = 'smtp.gmail.com';
    console.log('Using default Gmail SMTP host: smtp.gmail.com');
  } else {
    console.log('Using custom SMTP host:', smtpHost);
  }
  var smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  var smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  try {
    var transportConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: user,
        pass: pass,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
    };

    // Add TLS config for Gmail
    if (smtpHost.includes('gmail.com')) {
      transportConfig.tls = {
        rejectUnauthorized: false,
      };
      transportConfig.requireTLS = true;
    }

    // Add TLS config for Brevo (formerly Sendinblue)
    if (smtpHost.includes('brevo.com') || smtpHost.includes('sendinblue')) {
      transportConfig.tls = {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      };
      transportConfig.requireTLS = true;
      // Brevo uses port 587 with TLS
      if (!process.env.SMTP_PORT) {
        transportConfig.port = 587;
        transportConfig.secure = false;
      }
      // Increase timeouts for Brevo
      transportConfig.connectionTimeout = 30000;
      transportConfig.socketTimeout = 30000;
    }

    transporter = nodemailer.createTransport(transportConfig);

    // Verify connection (async, don't block)
    transporter.verify(function(error, success) {
      if (error) {
        console.warn('SMTP connection verification failed (emails may still work):', error.message);
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
          console.warn('💡 Connection issue detected. Possible causes:');
          console.warn('   1. SMTP_HOST might be incorrect. For Brevo, use: smtp-relay.brevo.com');
          console.warn('   2. Render may be blocking outbound SMTP connections');
          console.warn('   3. Check SMTP_PORT (should be 587 for Brevo)');
          console.warn('   4. Verify SMTP_USER and SMTP_PASS are correct');
        }
      } else {
        console.log('✅ SMTP server is ready to send emails');
        console.log('   Host:', smtpHost);
        console.log('   Port:', smtpPort);
      }
    });
  } catch (error) {
    console.error('Failed to initialize email transport:', error);
    transporter = null;
  }

  return transporter;
};

var buildContributionEmail = function (context) {
  var recipientName = context.firstName || 'भाई/बहन';
  var formLink = process.env.CONTRIBUTION_FORM_LINK || '#';
  var videoLink = 'https://youtu.be/Vk9yrdgceL0?si=tKsbYSn-0YBf7Kvh';
  // Use topic from Repository if provided, otherwise use default
  var subjectName = context.topicName ;
  var subjectCode = context.topicCode ;

  var lines = [
    'आदरणीय ' + recipientName + ',',
    '',
    'सादर प्रणाम,',
    '',
    'ब्रह्मऋषि विश्वामित्र शोध संस्थान(अखिल विश्व गायत्री परिवार ) में अपना मूल्यवान समयदान देने हेतु हम हृदय से आपका आभार व्यक्त करते हैं।',
    '',
    'परम पूज्य गुरुदेव की चेतना से DIYA ग्रुप, गायत्री परिवार के अंतर्गत चलाए जा रहे ब्रह्मऋषि विश्वामित्र शोध संस्थान की ओर से आपसे यह निवेदन है कि हम समाजहित, राष्ट्र निर्माण और जागरूकता के लिए शोध आधारित वीडियो सामग्री तैयार कर रहे हैं।',
    '',
    'अतः आप सभी से निवेदन है की इस ईमेल को ध्यानपूर्वक पढ़े |',
    '',
    '',
    'आपका सहयोग हमारे लिए अत्यंत महत्वपूर्ण है।',
    '',
    'आपका विषय :- ' + subjectName,
    'विषय कोड :- ' + subjectCode,
    '',
    '3. वीडियो बनाने से पूर्व कुछ महत्वपूर्ण बिंदु :-',
    '',
    '1. प्रारम्भ',
    '   * दर्शकों को नमस्कार और विषय का संक्षिप्त परिचय।',
    '',
    '2. विषय का परिचय एवं समस्या का प्रस्तुतिकरण',
    '   विषय को थोड़ा गहराई से समझाइए की यह विषय क्या है',
    '   विषय क्यों ज़रूरी है एवं',
    '   इस विषय से आज क्या समस्या आ रही है ।',
    '',
    '3. शोध आधारित जानकारी',
    '   प्रामाणिक और शोध-आधारित ज्ञान साझा करें।',
    '   (जैसे कोई लेटेस्ट न्यूज आपके टॉपिक से रिलेटेड या कोई लेटेस्ट एनालिटिकल डाटा)',
    '   बिंदुवार समझाएँ (3–4 मुख्य बिंदु)।',
    '   आसान भाषा, परंतु वैज्ञानिक दृष्टिकोण।',
    '',
    '4. समाधान और जीवन में उपयोग',
    '   व्यावहारिक समाधान प्रस्तुत करें।',
    '',
    '5. प्रेरणात्मक संदेश और आह्वान',
    '   समाज, राष्ट्र और मानवता के हित में सकारात्मक आह्वान।',
    '',
    '6. समापन',
    '   दर्शकों का धन्यवाद।',
    '',
    'नोट:— वीडियो की न्यूनतम लेंथ 12 - 15 मिनिट का होना चाहिए।',
    '',
    'महत्वपूर्ण बिंदु:',
    '* आपको स्वयं वीडियो एडिट नहीं करना है |',
    '* आपको वीडियो शूट करते समय भारतीय वेशभूषा धारण करना है |',
    '* भाषा सरल, स्पष्ट और प्रेरणादायक हो।',
    '* उदाहरण, तथ्य और शोध का आधार अवश्य हो।',
    '* पृष्ठभूमि शांति और गंभीरता वाली हो।',
    '* कोई व्यक्तिगत प्रचार या असंबंधित सामग्री शामिल न करें।',
    '* किसी भी प्रकार की राजनैतिक टिपण्णी न करे |',
    '',
    'हमारा उद्देश्य है कि आपका ज्ञान और अनुभव समाज के लिए मार्गदर्शक बने। कृपया इस फ़ॉर्मेट के अनुसार सामग्री तैयार करें और हमें वीडियो रूप में भेजें।',
    '',
    'आपके सुविधा के लिए वीडियो कैसे बनाये एवं आपके विषय का स्टडी मटेरियल इस ईमेल के साथ अटैच है |',
    '',
    'वीडियो लिंक :- ' + videoLink,
    '',
    '(यह वीडियो केवल वक्ताओं के लिए संदर्भ स्वरूप है, ताकि वे समझ सकें कि वीडियो किस प्रकार शूट किया गया है – जैसे कैमरा एंगल, कैमरे से दूरी आदि।)',
    '',
    'वीडियो भेजने की अंतिम अवधि :-',
    '',
    'वीडियो कैसे भेजे :-',
    '',
    'आपका रिकॉर्ड किया हुआ वीडियो अपने पर्सनल गूगल ड्राइव पर एक फोल्डर बना कर उसमे वीडियो अपलोड कर दे एवं वह फोल्डर इस ईमेल(bvshodhsansthan@gmail.com) पर शेयर कर दे |',
    '',
    'आपका सहयोग समाज के लिए एक अमूल्य योगदान होगा।',
    '',
    'धन्यवाद एवं शुभकामनाएँ।',
    '',
    'सादर,',
    'परम पूज्य गुरुदेव की चेतना से',
    'DIYA ग्रुप, गायत्री परिवार',
    'ब्रह्मऋषि विश्वामित्र शोध संस्थान',
  ];

  var text = lines.join('\n');
  var html =
    '<!DOCTYPE html>' +
    '<html lang="hi" dir="ltr">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: \'Noto Sans Devanagari\', \'Mangal\', Arial, sans-serif; background-color:#f5f5f5; direction:ltr; text-align:left;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">' +
    
    // Header
    '<tr>' +
    '<td style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:32px 40px; text-align:center;">' +
    '<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">🎥 वीडियो योगदान दिशानिर्देश</h1>' +
    '</td>' +
    '</tr>' +
    
    // Content
    '<tr>' +
    '<td style="padding:40px; text-align:left;">' +
    
    '<p style="margin:0 0 16px; color:#111827; font-size:16px; font-weight:600; text-align:left;">आदरणीय ' + recipientName + ',</p>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8; text-align:left;">सादर प्रणाम,</p>' +
    
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8; text-align:left;">ब्रह्मऋषि विश्वामित्र शोध संस्थान(अखिल विश्व गायत्री परिवार ) में अपना मूल्यवान समयदान देने हेतु हम हृदय से आपका आभार व्यक्त करते हैं।</p>' +
    
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8; text-align:left;">परम पूज्य गुरुदेव की चेतना से DIYA ग्रुप, गायत्री परिवार के अंतर्गत चलाए जा रहे ब्रह्मऋषि विश्वामित्र शोध संस्थान की ओर से आपसे यह निवेदन है कि हम समाजहित, राष्ट्र निर्माण और जागरूकता के लिए शोध आधारित वीडियो सामग्री तैयार कर रहे हैं।</p>' +
    
    '<div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:16px; border-radius:8px; margin:20px 0;">' +
    '<p style="margin:0; color:#78350f; font-size:14px; font-weight:600; text-align:left;">⚠️ अतः आप सभी से निवेदन है की इस ईमेल को ध्यानपूर्वक पढ़े |</p>' +
    '</div>' +
    
    '<p style="margin:16px 0; color:#374151; font-size:15px; line-height:1.8; text-align:left;">कृपया नीचे दिए गए लिंक पर उपलब्ध फॉर्म को भरने का कष्ट करें:</p>' +
    '<p style="margin:8px 0 16px; text-align:left;"><a href="' + formLink + '" style="color:#ea580c; font-size:15px; font-weight:600; text-decoration:none;">📝 फॉर्म भरें</a></p>' +
    
    '<p style="margin:16px 0; color:#374151; font-size:15px; line-height:1.8; text-align:left;">आपका सहयोग हमारे लिए अत्यंत महत्वपूर्ण है।</p>' +
    
    '<div style="background-color:#f9fafb; border-radius:8px; padding:20px; margin:20px 0;">' +
    '<p style="margin:0 0 8px; color:#111827; font-size:15px; font-weight:600; text-align:left;">📌 आपका विषय: <span style="color:#ea580c;">' + subjectName + '</span></p>' +
    '<p style="margin:0; color:#111827; font-size:15px; font-weight:600; text-align:left;">🏷️ विषय कोड: <span style="color:#ea580c;">' + subjectCode + '</span></p>' +
    '</div>' +
    
    '<h3 style="margin:24px 0 12px; color:#111827; font-size:18px; font-weight:700; text-align:left;">3. वीडियो बनाने से पूर्व कुछ महत्वपूर्ण बिंदु:</h3>' +
    
    '<div style="background-color:#f9fafb; border-radius:8px; padding:20px; margin:16px 0;">' +
    '<ol style="margin:0; padding-left:20px; color:#374151; font-size:15px; line-height:2; text-align:left;">' +
    '<li style="margin-bottom:12px;"><strong>प्रारम्भ</strong><br/><span style="color:#6b7280; font-size:14px;">दर्शकों को नमस्कार और विषय का संक्षिप्त परिचय।</span></li>' +
    '<li style="margin-bottom:12px;"><strong>विषय का परिचय एवं समस्या का प्रस्तुतिकरण</strong><br/><span style="color:#6b7280; font-size:14px;">विषय को थोड़ा गहराई से समझाइए की यह विषय क्या है, विषय क्यों ज़रूरी है एवं इस विषय से आज क्या समस्या आ रही है।</span></li>' +
    '<li style="margin-bottom:12px;"><strong>शोध आधारित जानकारी</strong><br/><span style="color:#6b7280; font-size:14px;">प्रामाणिक और शोध-आधारित ज्ञान साझा करें। (जैसे कोई लेटेस्ट न्यूज आपके टॉपिक से रिलेटेड या कोई लेटेस्ट एनालिटिकल डाटा) बिंदुवार समझाएँ (3–4 मुख्य बिंदु)। आसान भाषा, परंतु वैज्ञानिक दृष्टिकोण।</span></li>' +
    '<li style="margin-bottom:12px;"><strong>समाधान और जीवन में उपयोग</strong><br/><span style="color:#6b7280; font-size:14px;">व्यावहारिक समाधान प्रस्तुत करें।</span></li>' +
    '<li style="margin-bottom:12px;"><strong>प्रेरणात्मक संदेश और आह्वान</strong><br/><span style="color:#6b7280; font-size:14px;">समाज, राष्ट्र और मानवता के हित में सकारात्मक आह्वान।</span></li>' +
    '<li style="margin-bottom:12px;"><strong>समापन</strong><br/><span style="color:#6b7280; font-size:14px;">दर्शकों का धन्यवाद।</span></li>' +
    '</ol>' +
    '</div>' +
    
    '<div style="background-color:#fee2e2; border-left:4px solid #dc2626; padding:16px; border-radius:8px; margin:20px 0;">' +
    '<p style="margin:0 0 8px; color:#991b1b; font-size:14px; font-weight:600; text-align:left;">📝 नोट: वीडियो की न्यूनतम लेंथ 12 - 15 मिनिट का होना चाहिए।</p>' +
    '</div>' +
    
    '<h4 style="margin:20px 0 12px; color:#111827; font-size:16px; font-weight:600; text-align:left;">महत्वपूर्ण बिंदु:</h4>' +
    '<ul style="margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:1.8; text-align:left;">' +
    '<li style="margin-bottom:8px;">आपको स्वयं वीडियो एडिट नहीं करना है |</li>' +
    '<li style="margin-bottom:8px;">आपको वीडियो शूट करते समय भारतीय वेशभूषा धारण करना है |</li>' +
    '<li style="margin-bottom:8px;">भाषा सरल, स्पष्ट और प्रेरणादायक हो।</li>' +
    '<li style="margin-bottom:8px;">उदाहरण, तथ्य और शोध का आधार अवश्य हो।</li>' +
    '<li style="margin-bottom:8px;">पृष्ठभूमि शांति और गंभीरता वाली हो।</li>' +
    '<li style="margin-bottom:8px;">कोई व्यक्तिगत प्रचार या असंबंधित सामग्री शामिल न करें।</li>' +
    '<li style="margin-bottom:8px;">किसी भी प्रकार की राजनैतिक टिपण्णी न करे |</li>' +
    '</ul>' +
    
    '<p style="margin:20px 0; color:#374151; font-size:15px; line-height:1.8; text-align:left;">हमारा उद्देश्य है कि आपका ज्ञान और अनुभव समाज के लिए मार्गदर्शक बने। कृपया इस फ़ॉर्मेट के अनुसार सामग्री तैयार करें और हमें वीडियो रूप में भेजें।</p>' +
    
    '<div style="background-color:#f0f9ff; border-radius:8px; padding:16px; margin:20px 0;">' +
    '<p style="margin:0 0 8px; color:#111827; font-size:15px; font-weight:600; text-align:left;">🎬 वीडियो लिंक:</p>' +
    '<p style="margin:0; text-align:left;"><a href="' + videoLink + '" style="color:#0284c7; font-size:14px; text-decoration:none;">' + videoLink + '</a></p>' +
    '<p style="margin:8px 0 0; color:#6b7280; font-size:13px; text-align:left;">(यह वीडियो केवल वक्ताओं के लिए संदर्भ स्वरूप है, ताकि वे समझ सकें कि वीडियो किस प्रकार शूट किया गया है – जैसे कैमरा एंगल, कैमरे से दूरी आदि।)</p>' +
    '</div>' +
    
    '<h4 style="margin:20px 0 12px; color:#111827; font-size:16px; font-weight:600; text-align:left;">📤 वीडियो कैसे भेजे:</h4>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8; text-align:left;">आपका रिकॉर्ड किया हुआ वीडियो अपने पर्सनल गूगल ड्राइव पर एक फोल्डर बना कर उसमे वीडियो अपलोड कर दे एवं वह फोल्डर इस ईमेल (<a href="mailto:bvshodhsansthan@gmail.com" style="color:#ea580c;">bvshodhsansthan@gmail.com</a>) पर शेयर कर दे |</p>' +
    
    '<p style="margin:20px 0; color:#374151; font-size:15px; line-height:1.8; font-weight:600; text-align:left;">आपका सहयोग समाज के लिए एक अमूल्य योगदान होगा।</p>' +
    
    '<p style="margin:20px 0 8px; color:#374151; font-size:15px; line-height:1.8; text-align:left;">धन्यवाद एवं शुभकामनाएँ।</p>' +
    
    '</td>' +
    '</tr>' +
    
    // Footer
    '<tr>' +
    '<td style="background-color:#f9fafb; padding:24px 40px; border-top:1px solid #e5e7eb; text-align:left;">' +
    '<p style="margin:0 0 8px; color:#111827; font-size:15px; font-weight:600; text-align:left;">सादर,</p>' +
    '<p style="margin:0 0 4px; color:#6b7280; font-size:14px; text-align:left;">परम पूज्य गुरुदेव की चेतना से</p>' +
    '<p style="margin:0 0 4px; color:#6b7280; font-size:14px; text-align:left;">DIYA ग्रुप, गायत्री परिवार</p>' +
    '<p style="margin:0; color:#6b7280; font-size:14px; font-weight:600; text-align:left;">ब्रह्मऋषि विश्वामित्र शोध संस्थान</p>' +
    '</td>' +
    '</tr>' +
    
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>';

  return { text, html };
};

var buildContactEmail = function (context) {
  var recipientName = context.name || 'Valued Visitor';
  var inquiryType = context.inquiryType || 'inquiry';
  var inquiryTypeLabel = inquiryType
    .split('-')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  var lines = [
    'Dear ' + recipientName + ',',
    '',
    'Thank you for contacting the Brahmarishi Vishwamitra Research Center.',
    'We have received your ' + inquiryTypeLabel + ' inquiry and appreciate you reaching out to us.',
    '',
    'Our team will review your message and get back to you as soon as possible.',
    '',
    'If you have any urgent questions, please feel free to contact us directly.',
    '',
    'Warm regards,',
    'Brahmarishi Vishwamitra Research Center',
  ];

  var text = lines.join('\n');
  var html =
    '<p style="margin:0 0 16px;">Dear ' +
    recipientName +
    ',</p>' +
    '<p style="margin:0 0 16px;">Thank you for contacting the Brahmarishi Vishwamitra Research Center. We have received your <strong>' +
    inquiryTypeLabel +
    '</strong> inquiry and appreciate you reaching out to us.</p>' +
    '<p style="margin:0 0 16px;">Our team will review your message and get back to you as soon as possible.</p>' +
    '<p style="margin:0 0 16px;">If you have any urgent questions, please feel free to contact us directly.</p>' +
    '<p style="margin:0;">Warm regards,<br/>Brahmarishi Vishwamitra Research Center</p>';

  return { text, html };
};

// Send email using Brevo API (works better with Render - no SMTP port blocking)
var sendEmailViaBrevo = async function (to, from, subject, html, text) {
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.warn('⚠️ BREVO_API_KEY environment variable is not set');
    return null;
  }

  // Trim whitespace from API key
  brevoApiKey = brevoApiKey.trim();

  // Debug: Log first few characters (for troubleshooting, but don't log full key)
  var keyPreview = brevoApiKey.length > 10 ? brevoApiKey.substring(0, 10) + '...' : '***';
  console.log('🔑 Using Brevo API key (preview):', keyPreview, 'Length:', brevoApiKey.length);

  // Validate API key format (Brevo API keys start with 'xkeysib-' and are typically 60+ characters)
  if (!brevoApiKey.startsWith('xkeysib-')) {
    console.error('❌ Brevo API key format is incorrect!');
    console.error('   Expected format: xkeysib-... (starts with "xkeysib-")');
    console.error('   Your key starts with:', brevoApiKey.substring(0, Math.min(20, brevoApiKey.length)));
    console.error('   Make sure you are using the API KEY (not SMTP key) from Brevo dashboard');
    console.error('   Location: Settings → SMTP & API → API Keys section');
    throw new Error('Invalid Brevo API key format. Must start with "xkeysib-"');
  }

  if (brevoApiKey.length < 50) {
    console.warn('⚠️ Brevo API key seems too short. Typical API keys are 60+ characters.');
  }

  var postData = JSON.stringify({
    sender: {
      email: from,
      name: process.env.BREVO_SENDER_NAME || 'Brahmarishi Vishwamitra Research Center'
    },
    to: [
      {
        email: to
      }
    ],
    subject: subject,
    htmlContent: html,
    textContent: text
  });

  return new Promise(function (resolve, reject) {
    var options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000,
    };

    var req = https.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            var response = data ? JSON.parse(data) : { messageId: 'sent' };
            resolve(response);
          } catch (parseError) {
            resolve({ messageId: 'sent', raw: data });
          }
        } else {
          var errorData = data ? (function() {
            try {
              return JSON.parse(data);
            } catch (e) {
              return { message: data };
            }
          })() : { message: 'Unknown error' };
          
          // Provide helpful error messages
          if (res.statusCode === 401) {
            reject(new Error('Brevo API error: 401 Unauthorized - Invalid API key. Please check your BREVO_API_KEY environment variable. Make sure it starts with "xkeysib-" and is copied correctly from Brevo dashboard.'));
          } else if (res.statusCode === 400) {
            reject(new Error('Brevo API error: 400 Bad Request - ' + JSON.stringify(errorData)));
          } else {
            reject(new Error('Brevo API error: ' + res.statusCode + ' - ' + JSON.stringify(errorData)));
          }
        }
      });
    });

    req.on('error', function (error) {
      reject(error);
    });

    req.on('timeout', function () {
      req.destroy();
      reject(new Error('Brevo API timeout'));
    });

    req.write(postData);
    req.end();
  });
};

var sendContributionConfirmation = async function (recipientEmail, context) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.CONTRIBUTION_MAIL_SUBJECT || 'Thank you for your contribution submission';
  var content = buildContributionEmail(context || {});

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(recipientEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ Contribution confirmation email sent via Brevo API to:', recipientEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key') || brevoError.message.includes('Invalid Brevo API key format')) {
        console.warn('');
        console.warn('🔧 HOW TO FIX BREVO API KEY ISSUE:');
        console.warn('   1. Go to: https://app.brevo.com/');
        console.warn('   2. Navigate to: Settings → SMTP & API');
        console.warn('   3. Scroll to "API Keys" section (NOT "SMTP" section)');
        console.warn('   4. Click "Generate a new API key"');
        console.warn('   5. Copy the ENTIRE key (starts with xkeysib-, usually 60+ characters)');
        console.warn('   6. In Render: Environment → Add BREVO_API_KEY → Paste the key');
        console.warn('   7. Make sure there are NO spaces or quotes around the key');
        console.warn('   8. Restart your Render service');
        console.warn('');
      }
      // Fall through to SMTP
    }
  } else {
    console.warn('ℹ️ BREVO_API_KEY not set. Using SMTP (may timeout on Render).');
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping contribution confirmation email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: recipientEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000); // Increased timeout to 30 seconds
      })
    ]);
    console.log('✅ Contribution confirmation email sent successfully to:', recipientEmail);
    console.log('Email response:', info.response);
  } catch (error) {
    // Log detailed error for debugging
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', recipientEmail);
      console.warn('💡 This might indicate:');
      console.warn('   - Render is blocking outbound SMTP connections');
      console.warn('   - SMTP server is unreachable or slow');
      console.warn('   - Check SMTP_HOST and SMTP_PORT settings');
    } else if (error.code === 'EAUTH') {
      console.warn('⚠️ Email authentication failed - Check SMTP_USER and SMTP_PASS:', error.message);
    } else if (error.code === 'ENOTFOUND') {
      console.warn('⚠️ SMTP host not found - Check SMTP_HOST setting:', error.message);
    } else {
      console.warn('⚠️ Failed to send contribution confirmation email (non-critical):', error.message);
      if (error.code) {
        console.warn('Error code:', error.code);
      }
    }
    // Don't throw - email failure shouldn't break the main flow
  }
};

var escapeHtml = function (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

var buildAdminContactEmail = function (context) {
  var name = context.name || 'Unknown';
  var email = context.email || 'No email provided';
  var phone = (context.phone && String(context.phone).trim()) || '';
  var inquiryType = context.inquiryType || 'inquiry';
  var message = context.message || 'No message provided';
  var inquiryTypeLabel = inquiryType
    .split('-')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  var lines = [
    'New Contact Form Submission',
    '',
    'A new contact form submission has been received:',
    '',
    'Name: ' + name,
    'Email: ' + email,
    'Contact number: ' + (phone || 'Not provided'),
    'Inquiry Type: ' + inquiryTypeLabel,
    'Message:',
    message,
    '',
    'Please review and respond to this inquiry as soon as possible.',
  ];

  var text = lines.join('\n');
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color:#f5f5f5;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">' +
    
    // Header with gradient
    '<tr>' +
    '<td style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:32px 40px; text-align:center;">' +
    '<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">📧 New Contact Form Submission</h1>' +
    '<p style="margin:8px 0 0; color:#ffffff; font-size:14px; opacity:0.95;">You have received a new inquiry</p>' +
    '</td>' +
    '</tr>' +
    
    // Content section
    '<tr>' +
    '<td style="padding:40px;">' +
    
    // Info card
    '<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left:4px solid #f59e0b; padding:20px; border-radius:8px; margin-bottom:24px;">' +
    '<p style="margin:0; color:#78350f; font-size:14px; font-weight:600;">A new contact form submission has been received and requires your attention.</p>' +
    '</div>' +
    
    // Details section
    '<div style="background-color:#f9fafb; border-radius:8px; padding:24px; margin-bottom:24px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    
    // Name field
    '<tr>' +
    '<td style="padding:12px 0; border-bottom:1px solid #e5e7eb;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    '<tr>' +
    '<td width="140" style="color:#6b7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">👤 Name</td>' +
    '<td style="color:#111827; font-size:15px; font-weight:500;">' + name + '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    
    // Email field
    '<tr>' +
    '<td style="padding:12px 0; border-bottom:1px solid #e5e7eb;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    '<tr>' +
    '<td width="140" style="color:#6b7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">✉️ Email</td>' +
    '<td><a href="mailto:' + email + '" style="color:#ea580c; font-size:15px; font-weight:500; text-decoration:none;">' + email + '</a></td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    
    // Phone field
    '<tr>' +
    '<td style="padding:12px 0; border-bottom:1px solid #e5e7eb;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    '<tr>' +
    '<td width="140" style="color:#6b7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">📞 Contact</td>' +
    '<td style="color:#111827; font-size:15px; font-weight:500;">' +
    (phone ? escapeHtml(phone) : '<span style="color:#9ca3af;">Not provided</span>') +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    
    // Inquiry Type field
    '<tr>' +
    '<td style="padding:12px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    '<tr>' +
    '<td width="140" style="color:#6b7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">🏷️ Inquiry Type</td>' +
    '<td><span style="display:inline-block; background-color:#fef3c7; color:#78350f; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600;">' + inquiryTypeLabel + '</span></td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    
    '</table>' +
    '</div>' +
    
    // Message section
    '<div style="margin-bottom:24px;">' +
    '<h3 style="margin:0 0 12px; color:#111827; font-size:16px; font-weight:600;">💬 Message</h3>' +
    '<div style="background-color:#ffffff; border:2px solid #e5e7eb; border-radius:8px; padding:20px; min-height:100px;">' +
    '<p style="margin:0; color:#374151; font-size:15px; line-height:1.6; white-space:pre-wrap; word-wrap:break-word;">' + message + '</p>' +
    '</div>' +
    '</div>' +
    
    '</td>' +
    '</tr>' +
    
    // Footer
    '<tr>' +
    '<td style="background-color:#f9fafb; padding:24px 40px; text-align:center; border-top:1px solid #e5e7eb;">' +
    '<p style="margin:0 0 8px; color:#6b7280; font-size:13px;">Please review and respond to this inquiry as soon as possible.</p>' +
    '<p style="margin:0; color:#9ca3af; font-size:12px;">Brahmarishi Vishwamitra Research Center</p>' +
    '</td>' +
    '</tr>' +
    
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>';

  return { text, html };
};

var sendContactConfirmation = async function (recipientEmail, context) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.CONTACT_MAIL_SUBJECT || 'Thank you for contacting us';
  var content = buildContactEmail(context || {});

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(recipientEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ Contact confirmation email sent via Brevo API to:', recipientEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key')) {
        console.warn('💡 To fix: Go to https://app.brevo.com/ → Settings → SMTP & API → Generate a new API key');
        console.warn('   Then set BREVO_API_KEY in Render environment variables');
      }
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping contact confirmation email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: recipientEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000); // Increased timeout to 30 seconds
      })
    ]);
    console.log('✅ Contact confirmation email sent successfully to:', recipientEmail);
  } catch (error) {
    // Log as warning, not error, since email is non-critical
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', recipientEmail);
      console.warn('💡 Check SMTP_HOST and SMTP_PORT settings');
    } else {
      console.warn('⚠️ Failed to send contact confirmation email (non-critical):', error.message);
    }
    // Don't throw - email failure shouldn't break the main flow
  }
};

var sendAdminContactNotification = async function (adminEmail, context) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.ADMIN_CONTACT_MAIL_SUBJECT || 'New Contact Form Submission';
  var content = buildAdminContactEmail(context || {});

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(adminEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ Admin contact notification email sent via Brevo API to:', adminEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key')) {
        console.warn('💡 To fix: Go to https://app.brevo.com/ → Settings → SMTP & API → Generate a new API key');
        console.warn('   Then set BREVO_API_KEY in Render environment variables');
      }
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping admin notification email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: adminEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000); // Increased timeout to 30 seconds
      })
    ]);
    console.log('✅ Admin contact notification email sent successfully to:', adminEmail);
  } catch (error) {
    // Log as warning, not error, since email is non-critical
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', adminEmail);
      console.warn('💡 Check SMTP_HOST and SMTP_PORT settings');
    } else {
      console.warn('⚠️ Failed to send admin notification email (non-critical):', error.message);
    }
    // Don't throw - email failure shouldn't break the main flow
  }
};

var buildWelcomeEmail = function (context) {
  var recipientName = context.email || 'User';
  var recipientEmail = context.email;

  var lines = [
    'Welcome to Brahmarishi Vishwamitra Research Center!',
    '',
    'Dear ' + recipientName + ',',
    '',
    'Thank you for creating an account with us. We are excited to have you join our community.',
    '',
    'Your account has been successfully created. You can now:',
    '- Submit research contributions',
    '- Track your contributions',
    '- Access exclusive resources',
    '',
    'If you have any questions or need assistance, please feel free to contact us.',
    '',
    'Best regards,',
    'Brahmarishi Vishwamitra Research Center',
  ];

  var text = lines.join('\n');
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color:#f5f5f5;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">' +
    '<tr>' +
    '<td style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:32px 40px; text-align:center;">' +
    '<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">🎉 Welcome!</h1>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:40px;">' +
    '<p style="margin:0 0 16px; color:#111827; font-size:16px;">Dear ' + recipientEmail + ',</p>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8;">Thank you for creating an account with us. We are excited to have you join our community.</p>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8;">Your account has been successfully created. You can now:</p>' +
    '<ul style="margin:0 0 16px; padding-left:20px; color:#374151; font-size:15px; line-height:1.8;">' +
    '<li style="margin-bottom:8px;">Submit research contributions</li>' +
    '<li style="margin-bottom:8px;">Track your contributions</li>' +
    '<li style="margin-bottom:8px;">Access exclusive resources</li>' +
    '</ul>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8;">If you have any questions or need assistance, please feel free to contact us.</p>' +
    '<p style="margin:20px 0 8px; color:#374151; font-size:15px;">Best regards,<br/>Brahmarishi Vishwamitra Research Center</p>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>';

  return { text, html };
};

var buildLoginNotificationEmail = function (context) {
  var recipientEmail = context.email;
  var loginTime = context.loginTime || new Date().toLocaleString();

  var lines = [
    'Login Notification',
    '',
    'Dear User,',
    '',
    'You have successfully logged into your account.',
    '',
    'Login Time: ' + loginTime,
    '',
    'If this was not you, please change your password immediately and contact us.',
    '',
    'Best regards,',
    'Brahmarishi Vishwamitra Research Center',
  ];

  var text = lines.join('\n');
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color:#f5f5f5;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">' +
    '<tr>' +
    '<td style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:32px 40px; text-align:center;">' +
    '<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">🔐 Login Notification</h1>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:40px;">' +
    '<p style="margin:0 0 16px; color:#111827; font-size:16px;">Dear User,</p>' +
    '<p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.8;">You have successfully logged into your account.</p>' +
    '<div style="background-color:#f9fafb; border-radius:8px; padding:16px; margin:16px 0;">' +
    '<p style="margin:0; color:#111827; font-size:14px;"><strong>Login Time:</strong> ' + loginTime + '</p>' +
    '</div>' +
    '<div style="background-color:#fee2e2; border-left:4px solid #dc2626; padding:16px; border-radius:8px; margin:16px 0;">' +
    '<p style="margin:0; color:#991b1b; font-size:14px;">⚠️ If this was not you, please change your password immediately and contact us.</p>' +
    '</div>' +
    '<p style="margin:20px 0 8px; color:#374151; font-size:15px;">Best regards,<br/>Brahmarishi Vishwamitra Research Center</p>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>';

  return { text, html };
};

var sendWelcomeEmail = async function (recipientEmail) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.WELCOME_MAIL_SUBJECT || 'Welcome to Brahmarishi Vishwamitra Research Center';
  var content = buildWelcomeEmail({ email: recipientEmail });

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(recipientEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ Welcome email sent via Brevo API to:', recipientEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key')) {
        console.warn('💡 To fix: Go to https://app.brevo.com/ → Settings → SMTP & API → Generate a new API key');
        console.warn('   Then set BREVO_API_KEY in Render environment variables');
      }
      // Fall through to SMTP
    }
  } else {
    console.warn('ℹ️ BREVO_API_KEY not set. Using SMTP (may timeout on Render).');
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping welcome email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: recipientEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000);
      })
    ]);
    console.log('✅ Welcome email sent successfully to:', recipientEmail);
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', recipientEmail);
      console.warn('💡 Check SMTP_HOST and SMTP_PORT settings');
    } else {
      console.warn('⚠️ Failed to send welcome email (non-critical):', error.message);
    }
  }
};

var sendLoginNotification = async function (recipientEmail) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.LOGIN_MAIL_SUBJECT || 'Login Notification - Brahmarishi Vishwamitra Research Center';
  var loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  var content = buildLoginNotificationEmail({ email: recipientEmail, loginTime: loginTime });

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(recipientEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ Login notification email sent via Brevo API to:', recipientEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key')) {
        console.warn('💡 To fix: Go to https://app.brevo.com/ → Settings → SMTP & API → Generate a new API key');
        console.warn('   Then set BREVO_API_KEY in Render environment variables');
      }
      // Fall through to SMTP
    }
  } else {
    console.warn('ℹ️ BREVO_API_KEY not set. Using SMTP (may timeout on Render).');
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping login notification email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: recipientEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000);
      })
    ]);
    console.log('✅ Login notification email sent successfully to:', recipientEmail);
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', recipientEmail);
      console.warn('💡 Check SMTP_HOST and SMTP_PORT settings');
    } else {
      console.warn('⚠️ Failed to send login notification email (non-critical):', error.message);
    }
  }
};

var buildOTPEmail = function (otp, name) {
  var recipientName = name || 'User';

  var lines = [
    'Email Verification Code',
    '',
    'Dear ' + recipientName + ',',
    '',
    'Your verification code is: ' + otp,
    '',
    'This code will expire in 3 minutes.',
    '',
    'If you did not request this code, please ignore this email.',
    '',
    'Best regards,',
    'Brahmarishi Vishwamitra Research Center',
  ];

  var text = lines.join('\n');
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color:#f5f5f5;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">' +
    '<tr>' +
    '<td style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:32px 40px; text-align:center;">' +
    '<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">🔐 Email Verification</h1>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:40px;">' +
    '<p style="margin:0 0 16px; color:#111827; font-size:16px;">Dear ' + recipientName + ',</p>' +
    '<p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.8;">Your verification code is:</p>' +
    '<div style="background-color:#f9fafb; border:2px dashed #d1d5db; border-radius:8px; padding:24px; text-align:center; margin:24px 0;">' +
    '<p style="margin:0; color:#111827; font-size:32px; font-weight:700; letter-spacing:8px; font-family:monospace;">' + otp + '</p>' +
    '</div>' +
    '<p style="margin:0 0 16px; color:#6b7280; font-size:14px; text-align:center;">This code will expire in 3 minutes.</p>' +
    '<div style="background-color:#fee2e2; border-left:4px solid #dc2626; padding:16px; border-radius:8px; margin:24px 0;">' +
    '<p style="margin:0; color:#991b1b; font-size:13px;">⚠️ If you did not request this code, please ignore this email.</p>' +
    '</div>' +
    '<p style="margin:20px 0 8px; color:#374151; font-size:15px;">Best regards,<br/>Brahmarishi Vishwamitra Research Center</p>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>';

  return { text, html };
};

var sendOTPEmail = async function (recipientEmail, otp, name) {
  var from = process.env.MAIL_FROM || process.env.SMTP_USER;
  var subject = process.env.OTP_MAIL_SUBJECT || 'Email Verification Code - Brahmarishi Vishwamitra Research Center';
  var content = buildOTPEmail(otp, name);

  // Try Brevo API first (if API key is set) - works better with Render
  var brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      var result = await Promise.race([
        sendEmailViaBrevo(recipientEmail, from, subject, content.html, content.text),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Brevo API timeout after 30 seconds'));
          }, 30000);
        })
      ]);
      console.log('✅ OTP email sent via Brevo API to:', recipientEmail);
      return;
    } catch (brevoError) {
      console.warn('⚠️ Brevo API failed, falling back to SMTP:', brevoError.message);
      if (brevoError.message.includes('401') || brevoError.message.includes('Invalid API key')) {
        console.warn('💡 To fix: Go to https://app.brevo.com/ → Settings → SMTP & API → Generate a new API key');
        console.warn('   Then set BREVO_API_KEY in Render environment variables');
      }
      // Fall through to SMTP
    }
  } else {
    console.warn('ℹ️ BREVO_API_KEY not set. Using SMTP (may timeout on Render).');
  }

  // Fallback to SMTP
  var mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Email transporter not available. Skipping OTP email.');
    return;
  }

  try {
    var info = await Promise.race([
      mailTransporter.sendMail({
        to: recipientEmail,
        from: from,
        subject: subject,
        text: content.text,
        html: content.html,
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('Email send timeout after 30 seconds'));
        }, 30000);
      })
    ]);
    console.log('✅ OTP email sent successfully to:', recipientEmail);
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn('⚠️ Email send timeout (non-critical):', recipientEmail);
      console.warn('💡 Check SMTP_HOST and SMTP_PORT settings');
    } else {
      console.warn('⚠️ Failed to send OTP email (non-critical):', error.message);
    }
  }
};

module.exports = {
  sendContributionConfirmation,
  sendContactConfirmation,
  sendAdminContactNotification,
  sendWelcomeEmail,
  sendLoginNotification,
  sendOTPEmail,
};
