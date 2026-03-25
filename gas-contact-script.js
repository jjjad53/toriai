var ADMIN_EMAIL = 'konoshima@inoue-kouzai.co.jp';
var CONTACT_SHEET_NAME = 'TORIAI_お問い合わせ';

function getOrCreateContactSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(CONTACT_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONTACT_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['受付日時', 'ペンネーム', '件名', 'お問い合わせ内容']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  return sheet;
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var name = data.name || '匿名';
    var subject = data.subject || '未選択';
    var message = data.message || '';
    var now = new Date();

    var sheet = getOrCreateContactSheet();
    sheet.appendRow([
      now,
      name,
      subject,
      message
    ]);

    var body = [
      'TORIAI にお問い合わせが届きました。',
      '',
      'ペンネーム: ' + name,
      '件名: ' + subject,
      '',
      'お問い合わせ内容:',
      message,
      '',
      '受付日時: ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
    ].join('\n');

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: '【TORIAIお問い合わせ】' + subject,
      body: body
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('TORIAI contact endpoint is active.')
    .setMimeType(ContentService.MimeType.TEXT);
}
