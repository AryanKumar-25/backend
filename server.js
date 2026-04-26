import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;

// In-memory storage
let needs = [];
let donations = [];

// ----------------------
// Utility: Haversine Formula
// ----------------------
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ----------------------
// ADD NEED
// ----------------------
app.post("/api/add-need", (req, res) => {
  const need = {
    id: Date.now(),
    type: req.body.type,
    quantity: req.body.quantity,
    location: req.body.location,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    urgency: req.body.urgency,

    // NEW FIELDS
    recipientName: req.body.recipientName,
    organization: req.body.organization,
    email: req.body.email,
    phone: req.body.phone,
    peopleAffected: req.body.peopleAffected,
    notes: req.body.notes,
  };

  needs.push(need);
  res.json({ message: "Need added", need });
});

// ----------------------
// ADD DONATION
// ----------------------
app.post("/api/add-donation", (req, res) => {
  const donation = {
    id: Date.now(),
    type: req.body.type,
    quantity: req.body.quantity,
    location: req.body.location,
    latitude: req.body.latitude,
    longitude: req.body.longitude,

    // NEW FIELDS
    donorName: req.body.donorName,
    organization: req.body.organization,
    email: req.body.email,
    phone: req.body.phone,
    availability: req.body.availability,
    notes: req.body.notes,
  };

  donations.push(donation);
  res.json({ message: "Donation added", donation });
});

// ----------------------
// MATCHING ENGINE
// ----------------------
app.get("/api/match", (req, res) => {
  let matches = [];

  needs.forEach((need) => {
    donations.forEach((donation) => {
      const typeMatch = need.type === donation.type ? 1 : 0;

      const urgencyWeight =
        need.urgency === "high"
          ? 1
          : need.urgency === "medium"
          ? 0.6
          : 0.3;

      const distance = getDistance(
        need.latitude,
        need.longitude,
        donation.latitude,
        donation.longitude
      );

      const distanceScore = 1 / (1 + distance);

      const score =
        typeMatch * 50 + urgencyWeight * 30 + distanceScore * 20;

      matches.push({
        need,
        donation,
        distance: distance.toFixed(2),
        score: score.toFixed(2),
        createdAt: new Date().toISOString(), // NEW
      });
    });
  });

  matches.sort((a, b) => b.score - a.score);

  res.json(matches.slice(0, 5));
});

// ----------------------
// EXPLAIN MATCH
// ----------------------
app.post("/api/explain", (req, res) => {
  const { need, donation, distance } = req.body;

  const explanation = [];

  if (need.type === donation.type) {
    explanation.push("Exact resource match");
  }

  if (distance < 5) {
    explanation.push("Very close distance");
  }

  if (need.urgency === "high") {
    explanation.push("High urgency request");
  }

  explanation.push(
    `Supports approximately ${need.peopleAffected || 0} people`
  );

  res.json({
    explanation,
    donorSummary: {
      name: donation.donorName,
      organization: donation.organization,
      availability: donation.availability,
    },
    recipientSummary: {
      name: need.recipientName,
      organization: need.organization,
      peopleAffected: need.peopleAffected,
    },
    timestamp: new Date().toISOString(),
  });
});

// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});