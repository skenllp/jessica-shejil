/**
 * RSVP receiver for the wedding invitation (supports groom-side AND bride-side sites).
 * Setup: run setup() once, then Deploy as Web app (Execute as Me, access Anyone). After editing: Deploy > Manage deployments > New version.
 *
 * Invitation side:
 *  - The bride-side site sends invitationSide: "bride"; the response echoes { ok:true, side:"Bride" } so the site can confirm it
 *    is talking to an up-to-date script.
 *  - A request with NO invitationSide (the original groom-side site) is stored as "Groom", exactly as before.
 *  - Any other invitationSide value is rejected.
 *  - Rows are de-duplicated per side: the same name on both sides creates two rows (same name + same side = update).
 *    Existing groom-side rows keep their original key, so nothing already in the sheet is touched.
 */
const SHEET = 'RSVPs';
const SIDE_COL = 8; // column H: "Invitation side" (added after the original 7 columns so existing data does not shift)
const clean = v => { v = String(v == null ? '' : v).trim(); return /^[=+\-@]/.test(v) ? "'" + v : v; }; // blocks formula injection
const norm = n => String(n).trim().replace(/\s+/g, ' ').toLowerCase();
const reply = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

/** 'Bride' | 'Groom' | null (invalid). Missing value = legacy groom-side site. */
function parseSide(v) {
  if (v == null || v === '') return 'Groom';
  const s = String(v).trim().toLowerCase();
  return s === 'bride' ? 'Bride' : s === 'groom' ? 'Groom' : null;
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (_) { return reply({ ok: false, error: 'bad request' }); }
  if (b.website) return reply({ ok: true }); // honeypot: bots fill the hidden field
  const side = parseSide(b.invitationSide);
  if (!side) return reply({ ok: false, error: 'invalid data' });
  // Abuse guard: max 200 submissions per hour across the site
  const cache = CacheService.getScriptCache(), n = Number(cache.get('hits') || 0);
  if (n >= 200) return reply({ ok: false, error: 'busy' });
  cache.put('hits', String(n + 1), 3600);

  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const attending = b.attending === true;
  const guests = attending ? Math.floor(Number(b.guests)) : 0;
  if (name.length < 2 || name.length > 80 || (attending && !(guests >= 1 && guests <= 10)))
    return reply({ ok: false, error: 'invalid data' });
  const message = clean(b.message).slice(0, 500);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    if (!sh) return reply({ ok: false, error: 'run setup() first' });
    // Groom keys stay as the plain name (unchanged from the original script); bride keys are prefixed so sides never collide.
    const key = (side === 'Bride' ? 'bride|' : '') + norm(name), now = new Date(), att = attending ? 'Joyfully Accepts' : 'Regretfully Declines';
    const last = sh.getLastRow();
    let row = 0;
    if (last > 1) {
      const keys = sh.getRange(2, 7, last - 1, 1).getValues();
      for (let i = 0; i < keys.length; i++) if (keys[i][0] === key) { row = i + 2; break; }
    }
    if (row) {
      sh.getRange(row, 2, 1, 5).setValues([[now, clean(name), att, guests, message]]); // same guest + same side resubmits = update
      sh.getRange(row, SIDE_COL).setValue(side);
    } else sh.appendRow([now, now, clean(name), att, guests, message, key, side]);
    return reply({ ok: true, side });
  } finally { lock.releaseLock(); }
}

/** Run once from the editor (safe to re-run): creates/updates the RSVPs and Summary sheets. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.getRange(1, 1, 1, 8).setValues([['Submitted', 'Updated', 'Guest name', 'Attendance', 'Guests', 'Message', 'key', 'Invitation side']])
    .setFontWeight('bold').setBackground('#F5ECDD');
  sh.setFrozenRows(1); sh.hideColumns(7);
  sh.getRange('A:B').setNumberFormat('dd mmm yyyy, hh:mm');
  sh.setColumnWidths(1, 2, 140); sh.setColumnWidth(3, 200); sh.setColumnWidth(4, 150); sh.setColumnWidth(6, 320); sh.setColumnWidth(8, 130);
  // Rows saved before sides existed came from the groom-side site: label them so the sheet is unambiguous.
  const last = sh.getLastRow();
  if (last > 1) {
    const rng = sh.getRange(2, SIDE_COL, last - 1, 1), vals = rng.getValues();
    rng.setValues(vals.map(r => [r[0] === '' ? 'Groom' : r[0]]));
  }
  let sm = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sm.clear();
  sm.getRange('A1:D4').setValues([
    ['', 'All', 'Bride side', 'Groom side'],
    ['Responses', '=COUNTA(RSVPs!C2:C)', '=COUNTIF(RSVPs!H2:H,"Bride")', '=COUNTIF(RSVPs!H2:H,"Groom")'],
    ['Joyfully Accepts', '=COUNTIF(RSVPs!D2:D,"Joyfully Accepts")', '=COUNTIFS(RSVPs!D2:D,"Joyfully Accepts",RSVPs!H2:H,"Bride")', '=COUNTIFS(RSVPs!D2:D,"Joyfully Accepts",RSVPs!H2:H,"Groom")'],
    ['Regretfully Declines', '=COUNTIF(RSVPs!D2:D,"Regretfully Declines")', '=COUNTIFS(RSVPs!D2:D,"Regretfully Declines",RSVPs!H2:H,"Bride")', '=COUNTIFS(RSVPs!D2:D,"Regretfully Declines",RSVPs!H2:H,"Groom")']]);
  sm.getRange('A5:D5').setValues([['Total guests attending', '=SUMIF(RSVPs!D2:D,"Joyfully Accepts",RSVPs!E2:E)',
    '=SUMIFS(RSVPs!E2:E,RSVPs!D2:D,"Joyfully Accepts",RSVPs!H2:H,"Bride")', '=SUMIFS(RSVPs!E2:E,RSVPs!D2:D,"Joyfully Accepts",RSVPs!H2:H,"Groom")']]);
  sm.getRange('A1:D1').setFontWeight('bold'); sm.getRange('A1:A5').setFontWeight('bold'); sm.setColumnWidth(1, 200);
}
