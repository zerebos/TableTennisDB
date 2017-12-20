#!/usr/bin/python3

import asyncio
import discordbot

try:
    import uvloop
except ImportError:
    pass
else:
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

bot = discordbot.DiscordBot()

# @bot.command(pass_context=True)
# async def typingtest(ctx, continuous=False):
#     await bot.send_typing(ctx.message.channel, until_message=continuous)
#     await asyncio.sleep(20)
#     await bot.send_message(ctx.message.channel, "Stopped Typing")
#
# @bot.command(pass_context=True)
# async def sendtyping(ctx, continuous=False):
#     await bot.send_typing(ctx.message.channel, until_message=continuous)

@bot.command()
async def pingpong():
    await bot.say("I think you mean Table Tennis.")

@bot.command()
async def ping():
    await bot.say("Pong!")
    await bot.say("Hey wait, it's called Table Tennis not ping pong.")

if __name__ == '__main__':
    bot.load_cogs()
    bot.run()
