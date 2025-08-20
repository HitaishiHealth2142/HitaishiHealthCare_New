// translate.js
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

const translationClient = new TranslationServiceClient({
  keyFilename: "./config/service-account.json"
});

const projectId = "hitaishihealthcare-16099";
const location = "global";

async function translateText(text, targetLang) {
  const [response] = await translationClient.translateText({
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: "text/plain",
    targetLanguageCode: targetLang,
  });
  return response.translations[0].translatedText;
}

module.exports = translateText;
