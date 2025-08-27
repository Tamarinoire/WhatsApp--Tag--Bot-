const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        browser: ["Ubuntu", "Chrome", "22.04.4"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log("📌 Scan QR berikut untuk login WhatsApp:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            console.log("⚠️ Koneksi terputus. Mencoba reconnect...");
            startBot();
        }

        if (connection === "open") {
            const userJid = sock.user.id;
            const nomorBot = userJid.split(":")[0].replace(/[^0-9]/g, "");
            console.log("✅ Bot WhatsApp siap digunakan!");
            console.log(`📱 Nomor bot yang sedang login: ${nomorBot}`);
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;
            const pesan = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            console.log(`[Pesan] ${from}: ${pesan}`);

            if (pesan === "!tagall") {
                if (!from.endsWith("@g.us")) {
                    await sock.sendMessage(from, {
                        text: "⚠️ Perintah ini hanya bisa digunakan di grup!",
                    });
                    return;
                }

                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants;

                let teks = `📢 *Mention semua anggota grup ${metadata.subject}:*\n\n`;
                let mentions = [];

                for (let member of participants) {
                    mentions.push(member.id);
                    teks += `@${member.id.split("@")[0]} `;
                }

                await sock.sendMessage(from, {
                    text: teks,
                    mentions: mentions,
                });

                console.log(`✅ Berhasil mention ${participants.length} anggota grup ${metadata.subject}`);
            }
        } catch (err) {
            console.error("❌ Error handling message:", err);
        }
    });
}

startBot();
