import mysql from "mysql2/promise";
import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";

const app = express();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.static("images"));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const mapPlace = (row) => ({
  id: row.id,
  title: row.title,
  image: { src: row.image_src, alt: row.image_alt },
  lat: parseFloat(row.lat),
  lon: parseFloat(row.lon),
});

app.get("/places", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM places");
    const formattedPlaces = rows.map(mapPlace);

    res.status(200).json({ places: formattedPlaces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch places from database." });
  }
});

app.get("/user-places", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_places ORDER BY added_at DESC",
    );
    const formattedPlaces = rows.map(mapPlace);

    res.status(200).json({ places: formattedPlaces });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user places." });
  }
});

app.put("/user-places", async (req, res) => {
  const placeId = req.body.placeId;

  try {
    const [places] = await pool.query("SELECT * FROM places WHERE id = ?", [
      placeId,
    ]);

    if (places.length === 0) {
      return res.status(404).json({ message: "Place not found." });
    }

    const p = places[0];

    await pool.query(
      "INSERT IGNORE INTO user_places (id, title, image_src, image_alt, lat, lon) VALUES (?, ?, ?, ?, ?, ?)",
      [p.id, p.title, p.image_src, p.image_alt, p.lat, p.lon],
    );

    const [rows] = await pool.query(
      "SELECT * FROM user_places ORDER BY added_at DESC",
    );
    res.status(200).json({ userPlaces: rows.map(mapPlace) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save user place." });
  }
});

app.delete("/user-places/:id", async (req, res) => {
  const placeId = req.params.id;

  try {
    await pool.query("DELETE FROM user_places WHERE id = ?", [placeId]);

    const [rows] = await pool.query(
      "SELECT * FROM user_places ORDER BY added_at DESC",
    );
    res.status(200).json({ userPlaces: rows.map(mapPlace) });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user place." });
  }
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  res.status(404).json({ message: "404 - Not Found" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000 and connected to TiDB!");
});
