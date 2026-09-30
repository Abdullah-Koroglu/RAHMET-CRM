// Google Form'a bağlı Apps Script projesinde installable "On form submit" trigger'ı ile çalıştırın.
// Script Properties: CRM_WEBHOOK_URL ve CRM_WEBHOOK_SECRET.
function onFormSubmit(e) {
  if (!e || !e.response) throw new Error("Bu işlev Google Form installable trigger ile çalışmalıdır.");
  var properties = PropertiesService.getScriptProperties();
  var url = properties.getProperty("CRM_WEBHOOK_URL");
  var secret = properties.getProperty("CRM_WEBHOOK_SECRET");
  if (!url || !secret) throw new Error("CRM_WEBHOOK_URL/CRM_WEBHOOK_SECRET eksik.");

  var answers = {};
  e.response.getItemResponses().forEach(function (itemResponse) {
    answers[itemResponse.getItem().getTitle()] = String(itemResponse.getResponse() || "").trim();
  });
  var yes = function (value) { return /^evet$/i.test(value || ""); };
  var children = answers["Kaç çocuğunuz var?"];
  var payload = {
    schemaVersion: 1,
    sourceRecordId: "google-response:" + e.response.getId(),
    sourceSubmittedAt: e.response.getTimestamp().toISOString(),
    fields: {
      fullName: answers["Adınız ve soyadınız"] || "Ad bilgisi eksik",
      phoneRaw: answers["Telefon numaranız"] || "",
      birthDate: null,
      district: answers["Katılım sağlayacağınız ilçe"] || null,
      previousParticipant: yes(answers["Daha önce kurumumuzda başka bir eğitime katıldınız mı?"]),
      previousCourse: answers["Katıldıysanız hangi eğitime katıldınız?"] || null,
      maritalStatus: answers["Medeni haliniz"] || null,
      childrenCount: /^\d+$/.test(children || "") ? Number(children) : null,
      educationLevel: answers["Mezuniyet durumunuz"] || null,
      discoveryChannel: null,
      sourceCourseLabel: null
    }
  };
  var body = JSON.stringify(payload);
  var timestamp = String(Math.floor(Date.now() / 1000));
  var bytes = Utilities.computeHmacSha256Signature(timestamp + "." + body, secret);
  var signature = bytes.map(function (value) { var byte = value < 0 ? value + 256 : value; return ("0" + byte.toString(16)).slice(-2); }).join("");
  var response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: body, muteHttpExceptions: true, headers: { "X-RAHMET-Timestamp": timestamp, "X-RAHMET-Signature": signature } });
  if (response.getResponseCode() >= 300) throw new Error("CRM webhook HTTP " + response.getResponseCode());
}
