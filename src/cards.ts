import {createCanvas, loadImage, registerFont} from "canvas";

export default class ProfileCardGenerator {
    static async generateCard(user: any, profile: ProfileData): Promise<Buffer> {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext("2d");

        // Background gradient based on theme
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, profile.theme?.primaryColor || "#0099ff");
        gradient.addColorStop(1, profile.theme?.accentColor || "#ffffff");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Load and draw user avatar
        try {
            const avatar = await loadImage(user.displayAvatarURL({extension: "png", size: 128}));
            ctx.save();
            ctx.beginPath();
            ctx.arc(100, 100, 50, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(avatar, 50, 50, 100, 100);
            ctx.restore();
        }
 catch (error) {
            // Fallback circle if avatar fails
            ctx.fillStyle = "#cccccc";
            ctx.beginPath();
            ctx.arc(100, 100, 50, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Username and title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px Arial";
        ctx.fillText(user.username, 180, 80);

        ctx.font = "18px Arial";
        ctx.fillText("Table Tennis Player", 180, 110);

        // Equipment section
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Arial";
        ctx.fillText("Equipment", 50, 200);

        ctx.font = "18px Arial";
        ctx.fillText(`FH: ${profile.forehand || "Not set"}`, 50, 230);
        ctx.fillText(`BH: ${profile.backhand || "Not set"}`, 50, 260);
        ctx.fillText(`Blade: ${profile.blade || "Not set"}`, 50, 290);

        // Playing style section
        ctx.fillText("Playing Style", 400, 200);
        ctx.fillText(`Style: ${profile.playstyle || "Not set"}`, 400, 230);
        ctx.fillText(`Strengths: ${profile.strengths || "Not set"}`, 400, 260);
        ctx.fillText(`Weaknesses: ${profile.weaknesses || "Not set"}`, 400, 290);

        // Decorative elements based on theme
        // if (profile.theme?.style === "sport") {
            // Add ping pong ball decorations
            ctx.fillStyle = "#ffffff";
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(700 + (i * 20), 500 + (i * 10), 8, 0, 2 * Math.PI);
                ctx.fill();
            }
        // }

        return canvas.toBuffer("image/png");
    }
}