import calendar, datetime
from bs4 import BeautifulSoup
import re, json
from urllib import request
import aiohttp
import discordbot
from discordbot import utilities

class ITTF:
    """Looking up information on ITTF."""

    def __init__(self, bot):
        self.bot = bot

    @discordbot.commands.command(pass_context=True, aliases=['rank'])
    async def rankings(self, ctx, sex: str = "M", agegroup: int = 100, month: str = None, year: int = None):
        """Gets the world rankings

        Allows you to get the rankings of a specific gender, age group, month and year.
        This goes back to 2017 because that's how far the ITTF goes back.
        Genders: M, F
        Age groups: 100, 21, 18, 15
        Months: Jan-Dec
        Years: 2014-Present
        """
        headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
            'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
            'Accept-Encoding': 'none',
            'Accept-Language': 'en-US,en;q=0.8',
            'Connection': 'keep-alive'}

        list_data = {'100': {'listid': 43, 'Itemid': 208, 'db': 'fab_rnk', 'ids': [844, 353, 359, 356, 357, 652, 651, 653]},
                    '21': {'listid': 71, 'Itemid': 210, 'db': 'fab_rnk_u21', 'ids': [888, 689, 691, 697, 698, 703, 702, 704]},
                    '18': {'listid': 74, 'Itemid': 216, 'db': 'fab_rnk_u18', 'ids': [884, 740, 742, 748, 749, 754, 753, 755]},
                    '15': {'listid': 77, 'Itemid': 220, 'db': 'fab_rnk_u15', 'ids': [880, 791, 793, 799, 800, 805, 804, 806]}}

        await self.bot.type()
        if sex.lower().startswith(('f', 'w')):
            sex = "W"
        else:
            sex = "M"

        now = datetime.datetime.now()

        months = {**{v.lower(): k for k, v in enumerate(calendar.month_abbr)},
                  **{v.lower(): k for k, v in enumerate(calendar.month_name)}}
        try:
            month = months[month.lower()]
        except (KeyError, AttributeError) as e:
            month = now.month

        if year is None or year < 2014:
            year = now.year

        age = agegroup
        if age not in (15, 18, 21, 100):
            age = 100

        current_list = list_data[str(age)]

        data = {
        "fabrik_list_filter_all_{listid}_com_fabrik_{listid}".format(listid=current_list['listid']): "",
        "filter": "Go",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][0]".format(listid=current_list['listid']): "",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][0]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][0]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][0]".format(listid=current_list['listid']): "`fab_countries`.`continent`",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][0]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][0]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][0]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][0]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][0]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][0]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][0]".format(listid=current_list['listid']): current_list['ids'][0],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][1]".format(listid=current_list['listid']): sex,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][1]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][1]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][1]".format(listid=current_list['listid']): "`{db}`.`gender`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][1]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][1]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][1]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][1]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][1]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][1]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][1]".format(listid=current_list['listid']): current_list['ids'][1],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][2]".format(listid=current_list['listid']): "",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][2]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][2]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][2]".format(listid=current_list['listid']): "`{db}`.`assoc`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][2]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][2]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][2]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][2]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][2]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][2]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][2]".format(listid=current_list['listid']): current_list['ids'][2],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][3]".format(listid=current_list['listid']): month,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][3]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][3]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][3]".format(listid=current_list['listid']): "`{db}`.`mnth`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][3]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][3]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][3]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][3]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][3]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][3]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][3]".format(listid=current_list['listid']): current_list['ids'][3],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][4]".format(listid=current_list['listid']): year,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][4]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][4]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][4]".format(listid=current_list['listid']): "`{db}`.`yr`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][4]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][4]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][4]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][4]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][4]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][4]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][4]".format(listid=current_list['listid']): current_list['ids'][4],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][5]".format(listid=current_list['listid']): "",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][5]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][5]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][5]".format(listid=current_list['listid']): "`{db}`.`active_this_period`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][5]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][5]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][5]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][5]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][5]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][5]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][5]".format(listid=current_list['listid']): current_list['ids'][5],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][6]".format(listid=current_list['listid']): "",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][6]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][6]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][6]".format(listid=current_list['listid']): "`{db}`.`first_ranked`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][6]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][6]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][6]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][6]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][6]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][6]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][6]".format(listid=current_list['listid']): current_list['ids'][6],
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][value][7]".format(listid=current_list['listid']): "",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][condition][7]".format(listid=current_list['listid']): "=",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][join][7]".format(listid=current_list['listid']): "AND",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][key][7]".format(listid=current_list['listid']): "`{db}`.`activity`".format(db=current_list['db']),
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][search_type][7]".format(listid=current_list['listid']): "normal",
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][match][7]".format(listid=current_list['listid']): 1,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][full_words_only][7]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][eval][7]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][grouped_to_previous][7]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][hidden][7]".format(listid=current_list['listid']): 0,
        "fabrik___filter[list_{listid}_com_fabrik_{listid}][elementid][7]".format(listid=current_list['listid']): current_list['ids'][7],
        "limit{listid}".format(listid=current_list['listid']): 100,
        "limitstart{listid}".format(listid=current_list['listid']): 0,
        "option": "com_fabrik",
        "orderdir": "",
        "orderby": "",
        "view": "list",
        "listid": current_list['listid'],
        "listref": "{listid}_com_fabrik_{listid}".format(listid=current_list['listid']),
        "Itemid": current_list['Itemid'],
        "fabrik_referrer": "/index.php?option=com_fabrik&view=list&listid={listid}&Itemid={Itemid}".format(listid=current_list['listid'], Itemid=current_list['Itemid']),
        "6c4ed4bf027d9d9c5f25206f03e4ac93": 1,
        "9e9f9e838c8d854924d847e01ab8e6e9": 1,
        "format": "raw",
        "packageId": 0,
        "task": "list.filter",
        "fabrik_listplugin_name": "",
        "fabrik_listplugin_renderOrder": "",
        "fabrik_listplugin_options": "",
        "incfilters": 1,
        "setListRefFromRequest": 1,
        "tmpl": "bootstrap"
    }

        url = "http://results.ittf.link/index.php?option=com_fabrik&view=list&listid={listid}&Itemid={Itemid}&resetfilters=0&clearordering=0&clearfilters=0".format(listid=current_list['listid'], Itemid=current_list['Itemid'])
        async with aiohttp.ClientSession(loop=self.bot.loop) as session:
            async with session.post(url, headers=headers, timeout=30, data=data) as response:
                response_data = json.loads(await response.text())
                regex = re.compile(r" \([0-9]+\)")
                peeps = []
                for item in response_data['data'][0]:
                    data = item['data']
                    name = data['{0}___player_id'.format(current_list['db'])]
                    country = data['fab_countries___country'.format(current_list['db'])]
                    rating = data['{0}___points'.format(current_list['db'])]

                    name = regex.sub("", name)
                    peeps.append("{0} | {1} | {2}".format(name, country, rating))


                try:
                    p = discordbot.Pages(self.bot, message=ctx.message, entries=peeps)
                    p.embed.colour = discordbot.Colors.get_default(self.bot)

                    title = ""
                    if sex == "M":
                        title += "Men's"
                    else:
                        title += "Women's"

                    if age != 100:
                        title += " U" + str(age)

                    month_names = {v: k for v, k in enumerate(calendar.month_abbr)}
                    title += " Rankings " + month_names[month] + " " + str(year)

                    p.embed.set_author(name=title, icon_url="http://discord.zackrauen.com/TableTennisDB/ittf_logo.png", url=url)
                    await p.paginate()

                except Exception as e:
                    await self.bot.say(e)


    # @discordbot.commands.command(pass_context=True, aliases=['rank'])
    # async def rankings(self, ctx, sex: str = "M", agegroup: int = 100, month: str = None, year: int = None):
    #     """Gets the world rankings
    #
    #     Allows you to get the rankings of a specific gender, age group, month and year.
    #     This goes back to 2017 because that's how far the ITTF goes back.
    #     Genders: M, F
    #     Age groups: 100, 21, 18, 15
    #     Months: Jan-Dec
    #     Years: 2014-Present
    #     """
    #
    #     await self.bot.type()
    #     sex_char = "M"
    #     if sex.lower().startswith(('f', 'w')):
    #         sex_char = 'W'
    #
    #     months = {**{v.lower(): k for k, v in enumerate(calendar.month_abbr)},
    #               **{v.lower(): k for k, v in enumerate(calendar.month_name)}}
    #     try:
    #         month_num = months[month.lower()]
    #     except (KeyError, AttributeError) as e:
    #         recent = BeautifulSoup(await utilities.fetchURL(
    #             "http://dr.ittf.com/ittf_ranking/WR_Table_3_A2.asp?Month1=5&Year1=2017&Gender=M&Category=100M", self.bot.loop),
    #                                "html.parser").find_all("table")[0].find_all("tr")[1].contents[1].find_all("a")[
    #                      5].get_text()[:3]
    #         month_num = months[recent.lower()]
    #
    #     year_num = year
    #     if year_num is None or year_num < 2014:
    #         year_num = datetime.datetime.now().year
    #
    #     age = agegroup
    #     if age not in (15, 18, 21, 100):
    #         age = 100
    #
    #     soup = BeautifulSoup(await utilities.fetchURL(
    #         "http://dr.ittf.com/ittf_ranking/WR_Table_3_A2.asp?Month1={}&Year1={}&Gender={}&Category={}{}"
    #             .format(month_num, year_num, sex_char, age, sex_char), self.bot.loop), "html.parser")
    #
    #     rows = soup.find_all("table")[0].find_all("tr")[1].contents[3]
    #     peeps = []
    #     for row in rows.find_all("tr")[6:156]:
    #         # print(row)
    #         blocks = row.find_all("td")[2:]
    #         info = []
    #         for block in blocks:
    #             info.append(block.get_text().strip())
    #         peeps.append(' | '.join(info))
    #     try:
    #         p = discordbot.Pages(self.bot, message=ctx.message, entries=peeps)
    #         p.embed.colour = discordbot.Colors.get_default(self.bot)
    #
    #         title = ""
    #         if sex_char == "M":
    #             title += "Men's"
    #         else:
    #             title += "Women's"
    #
    #         if age != 100:
    #             title += " U"+str(age)
    #
    #         month_names = {v: k for v, k in enumerate(calendar.month_abbr)}
    #         title += " Rankings " + month_names[month_num] + " " + str(year_num)
    #
    #         p.embed.set_author(name=title, icon_url="http://dr.ittf.com/Logos/logo_world_ranking.gif")
    #         await p.paginate()
    #
    #     except Exception as e:
    #         await self.bot.say(e)

def setup(bot):
    bot.add_cog(ITTF(bot))