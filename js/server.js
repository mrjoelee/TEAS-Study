import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// RapidAPI key (keep this secret!)
const RAPIDAPI_KEY = "2ea21840dbmshbc03e035ea5c93ap1df4bejsn89317349cd63"; // replace with your RapidAPI key

app.post("/generate-example", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Word is required" });

  try {
    // Simple sentence generation: using the word as subject, verb "is", object "something"
    // You can adjust verb/object dynamically if you want
    const subject = word;
    const verb = "is";
    const object = "something";

    const params = new URLSearchParams({
      subject,
      verb,
      object,
      tense: "present"
    });

    const response = await fetch(`https://linguatools-sentence-generating.p.rapidapi.com/generate?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Host": "linguatools-sentence-generating.p.rapidapi.com",
        "X-RapidAPI-Key": RAPIDAPI_KEY
      }
    });

    const data = await response.json();
    console.log("Linguatools raw response:", data);

    const example = data.sentence || "(example unavailable)";
    res.json({ example });

  } catch (err) {
    console.error("Linguatools request error:", err);
    res.status(500).json({ error: "Sentence generation failed" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
