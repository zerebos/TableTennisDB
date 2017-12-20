import json
import operator
from bs4 import BeautifulSoup
import urllib
from urllib import request
import discordbot
import discordbot.utilities as utilities
import aiohttp

class DBItem(object):

    ITEM_TYPES = {'pips': {'name': 'Pips', 'cache_file': 'pips.json', 'url': 'pips'},
                  'blade': {'name': 'Blade', 'cache_file': 'blade.json', 'url': 'blade'},
                  'rubber': {'name': 'Rubber', 'cache_file': 'rubber.json', 'url': 'rubber'},
                  'table': {'name': 'Table', 'cache_file': 'table.json', 'url': 'table'},
                  'balls': {'name': 'Balls', 'cache_file': 'balls.json', 'url': 'balls'},
                  'shoes': {'name': 'Shoes', 'cache_file': 'shoes.json', 'url': 'shoes'},
                  'sponge': {'name': 'Sponge', 'cache_file': 'sponge.json', 'url': 'sponge'},
                  'trainingdvd': {'DVD': 'Pips', 'cache_file': 'trainingdvd.json', 'url': 'trainingdvd'},
                  'robot': {'name': 'Robot', 'cache_file': 'robot.json', 'url': 'robot'},
                  'net': {'name': 'Net', 'cache_file': 'net.json', 'url': 'net'},
                  'premade': {'name': 'Premade', 'cache_file': 'premade.json', 'url': 'premade'}}

    MATCHING_THRESHOLD = 0.84
    MIN_THRESHOLD = 0.7

    base_url = "http://www.tabletennisdb.com"
    end_url = ".html"

    def __init__(self, item_type, page, image, name, price, user_labels, user_ratings, review, mfr_labels, mfr_ratings):
        self.user_ratings = user_ratings
        self.user_labels = user_labels
        self.name = name
        self.image = image
        self.price = price
        self.review = review
        self.item_type = item_type
        self.mfr_labels = mfr_labels
        self.mfr_ratings = mfr_ratings
        self.page = page
        self.label_length = len(max(user_labels, key=len))
        if mfr_labels:
            if len(max(mfr_labels, key=len)) > self.label_length: self.label_length = len(max(mfr_labels, key=len))
        if self.label_length < 7: self.label_length = 7

    @staticmethod
    def from_json(file, string, matching_key):
        with open("cache/"+file) as json_data:
            data = json.load(json_data)

        candidates = []
        for rubber in data:
            if utilities.similar(string.lower(), rubber['name'].lower()) > 0.7:
                rubber['similarity'] = utilities.similar(string.lower(), rubber['name'].lower())
                candidates.append(rubber)

        wanted = {}
        if candidates:
            candidates.sort(key=operator.itemgetter('similarity'))
            wanted = candidates[-1]

        if wanted:
            return wanted
        else:
            return False

    @staticmethod
    def find_matches(item_type, string):
        with open("cache/"+item_type['cache_file']) as json_data:
            data = json.load(json_data)

        candidates = []
        for rubber in data:
            rubber['similarity'] = utilities.similar(string.lower(), rubber['name'].lower())
            candidates.append(rubber)

        candidates.sort(key=operator.itemgetter('similarity'), reverse=True)
        candidates = candidates[:5]
        return candidates

    @staticmethod
    async def get_best_match(item_type, string):
        return await DBItem.get_item(DBItem.ITEM_TYPES[item_type], DBItem.find_matches(DBItem.ITEM_TYPES[item_type], string)[0]['page'])

    @staticmethod
    async def get_item(item_type, page, loop):
        # urllib.request.urlopen(DBItem.base_url + '/' + item_type['url'] + '/' + page + DBItem.end_url).read()
        soup = BeautifulSoup(await utilities.fetchURL(DBItem.base_url + '/' + item_type['url'] + '/' + page + DBItem.end_url, loop), "html.parser")

        name = soup.find_all("h1", class_="fn")[0].get_text()
        review = soup.find_all("span", class_="average")[0].get_text()
        image = DBItem.base_url + soup.find("img", class_="product_detail_image")['src']
        price = soup.find(id="price_show").get_text().strip()
        ratings = []
        mfr_ratings = []
        labels = []
        mfr_labels = []

        for label in soup.find_all("table", class_="ProductRatingTable")[0].find_all("td", class_="cell_label")[:-1]:
            label = label.get_text().encode('ascii', 'ignore').decode('ascii').strip()
            labels.append(label)

        for rating in soup.find_all("table", class_="ProductRatingTable")[0].find_all("td", class_="cell_rating")[:-1]:
            rating = rating.get_text().encode('ascii', 'ignore').decode('ascii').strip()
            ratings.append(rating)

        if len(soup.find_all("table", class_="ProductRatingTable")) > 1:
            for label in soup.find_all("table", class_="ProductRatingTable")[1].find_all("td", class_="cell_label"):
                label = label.get_text().encode('ascii', 'ignore').decode('ascii').strip()
                mfr_labels.append(label)

            for rating in soup.find_all("table", class_="ProductRatingTable")[1].find_all("td", class_="cell_rating"):
                rating = rating.get_text().encode('ascii', 'ignore').decode('ascii').strip()
                mfr_ratings.append(rating)


        return DBItem(item_type, page, image, name, price, labels, ratings, review, mfr_labels, mfr_ratings)

    def toDiscordString(self):
        response = "```" + '\n'
        response += self.name.center(self.label_length * 2 + 1) + '\n'
        response += self.price.center(self.label_length * 2 + 1) + '\n'
        response += ''.rjust(self.label_length * 2 + 1, '-') + '\n'
        for i, rating in enumerate(self.user_ratings):
            response += self.user_labels[i].rjust(self.label_length) + ': ' + self.user_ratings[i] + '\n'
        response += 'Overall: '.rjust(self.label_length + 2) + self.review + '\n\n'
        for i, rating in enumerate(self.mfr_ratings):
            response += self.mfr_labels[i].rjust(self.label_length) + ': ' + self.mfr_ratings[i] + '\n'
        response += "```"
        response += '\n\n'
        response += 'See more at: ' + DBItem.base_url + '/' + self.item_type['url'] + '/' + self.page + DBItem.end_url
        return response

    def toDiscordEmbed(self):
        e = discordbot.Embed(colour=0x738bd7)
        e.title = self.name
        response = ""

        for i, rating in enumerate(self.user_ratings):
            response += self.user_labels[i] + ': ' + self.user_ratings[i] + '\n'
        response += 'Overall: ' + self.review + '\n\n'

        e.description = response

        if self.mfr_labels:
            mfr_response = ""
            for i, rating in enumerate(self.mfr_ratings):
                mfr_response += self.mfr_labels[i] + ': ' + self.mfr_ratings[i] + '\n'
            e.add_field(name="Manufacturer Notes", value=mfr_response, inline=False)

        e.add_field(name="Cost", value=self.price, inline=False)

        e.add_field(name="See More",
                    value=DBItem.base_url + '/' + self.item_type['url'] + '/' + self.page + DBItem.end_url, inline=False)

        e.set_thumbnail(url=self.image)

        return e
