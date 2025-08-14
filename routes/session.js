// routes/session.js
const express = require('express');
const router = express.Router();
const db = require('./db'); // your existing DB connection

// Make sure the lock row exists
db.query("INSERT IGNORE INTO session_lock (id, is_locked) VALUES (1, 0)", () => {});

// Who am I / lock status
router.get('/session/status', (req, res) => {
  db.query("SELECT is_locked, session_id, user_type, user_id, started_at FROM session_lock WHERE id=1", (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const lock = rows[0] || {};
    res.json({
      locked: !!lock.is_locked,
      lockedByMe: lock.session_id === req.sessionID,
      lock: lock,
      me: req.session?.user || null,
      isAuthenticated: !!req.session?.isAuthenticated
    });
  });
});

// Logout (and unlock if this session owns the lock)
router.post('/logout', (req, res) => {
  db.query("SELECT session_id FROM session_lock WHERE id=1", (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const currentLockSid = rows?.[0]?.session_id;

    const finish = () => {
      res.clearCookie('hh.sid');
      return res.json({ success: true, message: 'Logged out' });
    };

    // If this session owns the lock, release it
    const unlockIfOwner = (cb) => {
      if (currentLockSid && currentLockSid === req.sessionID) {
        db.query(
          "UPDATE session_lock SET is_locked=0, session_id=NULL, user_type=NULL, user_id=NULL, started_at=NULL WHERE id=1",
          () => cb()
        );
      } else cb();
    };

    // Destroy session then finish
    unlockIfOwner(() => {
      if (req.session) {
        req.session.destroy(() => finish());
      } else finish();
    });
  });
});

// Emergency force unlock (requires admin token)
router.post('/session/force-unlock', (req, res) => {
  const token = req.get('x-admin-token');
  if (token !== process.env.ADMIN_UNLOCK_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.query(
    "UPDATE session_lock SET is_locked=0, session_id=NULL, user_type=NULL, user_id=NULL, started_at=NULL WHERE id=1",
    (err) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, message: 'Force-unlocked' });
    }
  );
});

module.exports = router;
