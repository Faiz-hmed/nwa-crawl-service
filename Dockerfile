FROM node:17


RUN  apt-get update \
     && apt-get install -y wget gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     # We install Chrome to get all the OS level dependencies, but Chrome itself
     # is not actually used as it's packaged in the node puppeteer library.
     # Alternatively, we could could include the entire dep list ourselves
     # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
     # but that seems too easy to get out of date.
     && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
     --no-install-recommends \
     && rm -rf /var/lib/apt/lists/*

     # && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     # && chmod +x /usr/sbin/wait-for-it.sh

WORKDIR /
COPY package*.json /
RUN npm install 


VOLUME [ "/vol/web/media" ]


RUN mkdir -p /home/node/Downloads \
    && chown -R node:node /node_modules \
    && chown -R node:node /package.json \
    && chown -R node:node /package-lock.json 


COPY . .
RUN mv scraper.js scrape.js && chown -R node:node /scrape.js /utils/download.js
USER node

EXPOSE 80
EXPOSE 8080