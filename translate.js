app.post("/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    // Split by ||| if multiple
    const parts = text.split("|||");

    const [response] = await translationClient.translateText({
      parent: `projects/${projectId}/locations/${location}`,
      contents: parts,
      mimeType: "text/plain",
      targetLanguageCode: targetLang,
    });

    const translations = response.translations.map(t => t.translatedText);
    res.json({ translatedText: translations.join("|||") });

  } catch (err) {
    console.error("Error in /translate:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});
