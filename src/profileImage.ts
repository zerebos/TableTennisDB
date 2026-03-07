import {createCanvas, loadImage} from "@napi-rs/canvas";
import type {ProfileData} from "./types.js";

// ─── Layout Constants ────────────────────────────────────────────────────────

const CANVAS_W = 820;

const LEFT_W = 220;
const DIVIDER_X = LEFT_W + 12;
const RIGHT_X = DIVIDER_X + 18;
const RIGHT_W = CANVAS_W - RIGHT_X - 16;
const COL_GAP = 12;
const COL_W = (RIGHT_W - COL_GAP) / 2;

const ACCENT_BAR = 3;
const CARD_HPAD = 10;     // horizontal padding inside cards
const CARD_VPAD = 10;     // vertical padding inside cards
const LABEL_H = 16;       // height of label row
const LINE_H = 17;        // line height for value text
const ROW_GAP = 10;       // gap between card rows
const SECTION_GAP = 18;   // gap between GEAR and SKILLS sections
const SECTION_H = 28;     // section header height
const TOP_PAD = 20;       // top padding for right panel
const BOT_PAD = 28;       // bottom padding

const FONT = "Lato, DejaVu Sans, sans-serif";

// ─── Color Palette ───────────────────────────────────────────────────────────

const C = {
    bgStart:   "#0a0f1a",
    bgEnd:     "#0d1b2a",
    leftBg:    "#0d1424",
    accent:    "#3b82f6",
    gear:      "#f97316",
    skills:    "#22c55e",
    text:      "#e6edf3",
    muted:     "#8b949e",
    divider:   "#30363d",
    card:      "#161b22",
    cardBorder:"#30363d",
    footer:    "#4b5563",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundedRect(
    ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    x: number, y: number, w: number, h: number, r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

type CanvasCtx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

/** Returns number of lines needed for the given text at the given max width. */
function countLines(ctx: CanvasCtx, text: string, maxWidth: number): number {
    const words = text.split(" ");
    let lines = 1;
    let line = "";
    for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
            lines++;
            line = word;
        } else {
            line = test;
        }
    }
    return lines;
}

/** Draws wrapped text and returns the Y position after the last line. */
function drawWrapped(
    ctx: CanvasCtx,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
): number {
    const words = text.split(" ");
    let line = "";
    let curY = y;
    for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
            ctx.fillText(line, x, curY);
            curY += LINE_H;
            line = word;
        } else {
            line = test;
        }
    }
    if (line) ctx.fillText(line, x, curY);
    return curY + LINE_H;
}

// ─── Layout Calculator ───────────────────────────────────────────────────────

type CardMeta = {
    x: number;
    y: number;
    w: number;
    h: number;
    lines: number;
};

type Layout = {
    totalH: number;
    gearSectionY: number;
    fh: CardMeta;
    bh: CardMeta;
    blade: CardMeta;
    skillsSectionY: number;
    str: CardMeta;
    wk: CardMeta;
    ps: CardMeta;
};

function cardH(lines: number) {
    return CARD_VPAD + LABEL_H + lines * LINE_H + CARD_VPAD;
}

function calcLayout(ctx: CanvasCtx, profile: ProfileData): Layout {
    const textW = (cardWidth: number) => cardWidth - ACCENT_BAR - CARD_HPAD * 2;

    ctx.font = `13px "${FONT}"`;

    const fhLines  = countLines(ctx, profile.forehand  || "Not set", textW(COL_W));
    const bhLines  = countLines(ctx, profile.backhand  || "Not set", textW(COL_W));
    const blLines  = countLines(ctx, profile.blade     || "Not set", textW(RIGHT_W));
    const strLines = countLines(ctx, profile.strengths || "Not set", textW(COL_W));
    const wkLines  = countLines(ctx, profile.weaknesses|| "Not set", textW(COL_W));
    const psLines  = countLines(ctx, profile.playstyle || "Not set", textW(RIGHT_W));

    let y = TOP_PAD;

    const gearSectionY = y;
    y += SECTION_H;

    // Row 1: forehand + backhand (equal height)
    const row1H = cardH(Math.max(fhLines, bhLines));
    const fh: CardMeta = {x: RIGHT_X, y, w: COL_W, h: row1H, lines: fhLines};
    const bh: CardMeta = {x: RIGHT_X + COL_W + COL_GAP, y, w: COL_W, h: row1H, lines: bhLines};
    y += row1H + ROW_GAP;

    // Row 2: blade (full width)
    const blade: CardMeta = {x: RIGHT_X, y, w: RIGHT_W, h: cardH(blLines), lines: blLines};
    y += blade.h + SECTION_GAP;

    const skillsSectionY = y;
    y += SECTION_H;

    // Row 3: strengths + weaknesses (equal height)
    const row3H = cardH(Math.max(strLines, wkLines));
    const str: CardMeta = {x: RIGHT_X, y, w: COL_W, h: row3H, lines: strLines};
    const wk: CardMeta  = {x: RIGHT_X + COL_W + COL_GAP, y, w: COL_W, h: row3H, lines: wkLines};
    y += row3H + ROW_GAP;

    // Row 4: playstyle (full width)
    const ps: CardMeta = {x: RIGHT_X, y, w: RIGHT_W, h: cardH(psLines), lines: psLines};
    y += ps.h;

    const totalH = Math.max(y + BOT_PAD, 320);

    return {totalH, gearSectionY, fh, bh, blade, skillsSectionY, str, wk, ps};
}

// ─── Drawing Functions ───────────────────────────────────────────────────────

function drawBackground(ctx: CanvasCtx, totalH: number) {
    // Main background gradient
    const bg = ctx.createLinearGradient(0, 0, CANVAS_W, totalH);
    bg.addColorStop(0, C.bgStart);
    bg.addColorStop(1, C.bgEnd);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, totalH);

    // Left panel background
    ctx.fillStyle = C.leftBg;
    ctx.fillRect(0, 0, LEFT_W, totalH);

    // Top accent stripe
    const stripe = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
    stripe.addColorStop(0,   C.accent);
    stripe.addColorStop(0.5, C.gear);
    stripe.addColorStop(1,   C.skills);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, CANVAS_W, 4);

    // Vertical divider
    ctx.strokeStyle = C.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(DIVIDER_X, 16);
    ctx.lineTo(DIVIDER_X, totalH - 16);
    ctx.stroke();
}

async function drawAvatar(ctx: CanvasCtx, totalH: number, avatarURL: string) {
    const cx = LEFT_W / 2;
    const cy = Math.min(totalH / 2 - 30, 150);
    const r = 52;

    // Subtle glow ring behind avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 8);
    glow.addColorStop(0, "rgba(59,130,246,0.35)");
    glow.addColorStop(1, "rgba(59,130,246,0)");
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();

    // Clip to circle and draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    try {
        const response = await fetch(avatarURL);
        const buffer = Buffer.from(await response.arrayBuffer());
        const img = await loadImage(buffer);
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } catch (err) {
        console.error("[profileImage] Failed to load avatar from", avatarURL, err);
        const fb = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, r);
        fb.addColorStop(0, "#1e3a5f");
        fb.addColorStop(1, "#0d1b2a");
        ctx.fillStyle = fb;
        ctx.fill();
    }
    ctx.restore();

    // Accent border ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    return cy; // returns the avatar center Y
}

function drawUserInfo(ctx: CanvasCtx, username: string, avatarCY: number) {
    const cx = LEFT_W / 2;
    const nameY = avatarCY + 52 + 22;

    // Username — truncate if too wide
    ctx.font = `bold 15px "${FONT}"`;
    ctx.fillStyle = C.text;
    ctx.textAlign = "center";
    const maxW = LEFT_W - 20;
    let name = username;
    while (ctx.measureText(name).width > maxW && name.length > 1) {
        name = name.slice(0, -1);
    }
    if (name !== username) name += "…";
    ctx.fillText(name, cx, nameY);

    // Subtitle
    ctx.font = `11px "${FONT}"`;
    ctx.fillStyle = C.muted;
    ctx.fillText("Table Tennis Profile", cx, nameY + 18);

    // Ping-pong ball decoration
    const ballX = cx;
    const ballY = nameY + 42;
    const ballR = 8;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fillStyle = "#f5f5f5";
    ctx.fill();
    // Ball curved line
    ctx.beginPath();
    ctx.arc(ballX - 1, ballY + 1, ballR - 1, -0.6, 0.4);
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

function drawSectionHeader(ctx: CanvasCtx, label: string, color: string, y: number) {
    // Pill-shaped colored badge
    ctx.font = `bold 12px "${FONT}"`;
    const badgeW = ctx.measureText(label).width + 18;
    const badgeH = 20;
    const badgeY = y + 2;

    ctx.save();
    roundedRect(ctx, RIGHT_X, badgeY, badgeW, badgeH, 5);
    ctx.fillStyle = color + "22"; // very translucent fill
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(label, RIGHT_X + 9, badgeY + 14);

    // Separator line from badge to right edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RIGHT_X + badgeW + 8, badgeY + badgeH / 2);
    ctx.lineTo(RIGHT_X + RIGHT_W, badgeY + badgeH / 2);
    ctx.strokeStyle = color + "44";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawFieldCard(
    ctx: CanvasCtx,
    label: string,
    value: string,
    meta: CardMeta,
    accentColor: string,
) {
    const {x, y, w, h} = meta;
    const textX = x + ACCENT_BAR + CARD_HPAD;
    const textW = w - ACCENT_BAR - CARD_HPAD * 2;

    // Card background
    ctx.save();
    roundedRect(ctx, x, y, w, h, 7);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Left accent bar
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + ACCENT_BAR, y + 7);
    ctx.lineTo(x + ACCENT_BAR, y + h - 7);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = ACCENT_BAR;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.font = `bold 10px "${FONT}"`;
    ctx.fillStyle = C.muted;
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), textX, y + CARD_VPAD + 11);

    // Value
    ctx.font = `13px "${FONT}"`;
    ctx.fillStyle = C.text;
    const valueY = y + CARD_VPAD + LABEL_H + 4;
    drawWrapped(ctx, value || "Not set", textX, valueY, textW);
}

function drawFooter(ctx: CanvasCtx, totalH: number) {
    ctx.font = `10px "${FONT}"`;
    ctx.fillStyle = C.footer;
    ctx.textAlign = "right";
    ctx.fillText("TableTennisDB", CANVAS_W - 12, totalH - 10);
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Generates a fancy profile image for the given user and profile data.
 * Returns a PNG buffer suitable for attaching to a Discord message.
 */
export async function generateProfileImage(
    user: {username: string; displayAvatarURL: (opts: {extension: string; size: number}) => string},
    profile: ProfileData,
): Promise<Buffer> {
    // First pass: measure layout using a temporary context
    const measureCanvas = createCanvas(CANVAS_W, 800);
    const measureCtx = measureCanvas.getContext("2d");
    const layout = calcLayout(measureCtx, profile);

    // Second pass: draw onto correctly-sized canvas
    const canvas = createCanvas(CANVAS_W, layout.totalH);
    const ctx = canvas.getContext("2d");

    const avatarURL = user.displayAvatarURL({extension: "png", size: 256});

    drawBackground(ctx, layout.totalH);
    const avatarCY = await drawAvatar(ctx, layout.totalH, avatarURL);
    drawUserInfo(ctx, user.username, avatarCY);

    // GEAR section
    drawSectionHeader(ctx, "GEAR", C.gear, layout.gearSectionY);
    drawFieldCard(ctx, "Forehand", profile.forehand ?? "", layout.fh, C.gear);
    drawFieldCard(ctx, "Backhand", profile.backhand ?? "", layout.bh, C.gear);
    drawFieldCard(ctx, "Blade",    profile.blade    ?? "", layout.blade, C.gear);

    // SKILLS section
    drawSectionHeader(ctx, "SKILLS", C.skills, layout.skillsSectionY);
    drawFieldCard(ctx, "Strengths",  profile.strengths  ?? "", layout.str, C.skills);
    drawFieldCard(ctx, "Weaknesses", profile.weaknesses ?? "", layout.wk,  C.skills);
    drawFieldCard(ctx, "Playstyle",  profile.playstyle  ?? "", layout.ps,  C.skills);

    drawFooter(ctx, layout.totalH);

    ctx.textAlign = "left";

    return canvas.toBuffer("image/png");
}
