// Based off: https://github.com/Osedea/react-native-opengraph-kit/
// License: MIT (https://github.com/Osedea/react-native-opengraph-kit/blob/master/LICENSE)
import { AllHtmlEntities } from 'html-entities';

const entities = new AllHtmlEntities();

function findOGTags(content, url) {
    const metaTagOGRegex = /<meta[^>]*(?:property=[ '"]*og:([^'"]*))?[^>]*(?:content=["]([^"]*)["])?[^>]*>/gi;
    const matches = content.match(metaTagOGRegex);
    const meta = {};

    if (matches) {
        const metaPropertyRegex = /<meta[^>]*property=[ "]*og:([^"]*)[^>]*>/i;
        const metaContentRegex = /<meta[^>]*content=[ "]([^"]*)[^>]*>/i;

        matches.forEach((match) => {
            let metaName;
            let metaValue;
            let propertyMatch;
            let contentMatch;

            try {
                propertyMatch = metaPropertyRegex.exec(match);
                contentMatch = metaContentRegex.exec(match);

                if (!propertyMatch || !contentMatch) {
                    return;
                }

                metaName = propertyMatch[1].trim();
                metaValue = contentMatch[1].trim();

                if (!metaName || !metaValue) {
                    return;
                }
            } catch (error) {
                if (__DEV__) {
                    console.log(error);
                }

                return;
            }

            if (metaValue.length > 0) {
                if (metaValue[0] === '/') {
                    if (metaValue.length <= 1 || metaValue[1] !== '/') {
                        if (url[url.length - 1] === '/') {
                            metaValue = `${url}${metaValue.substring(1)}`;
                        } else {
                            metaValue = `${url}${metaValue}`;
                        }
                    } else {
                        // handle protocol agnostic meta URLs
                        if (url.indexOf('https://') === 0) {
                            metaValue = `https:${metaValue}`;
                        }

                        if (url.indexOf('http://') === 0) {
                            metaValue = `http:${metaValue}`;
                        }
                    }
                }
            } else {
                return;
            }

            meta[metaName] = entities.decode(metaValue);
        });
    }

    return meta;
}

function findHTMLMetaTags(content, url) {
    const metaTagHTMLRegex = /<meta(?:[^>]*(?:name|itemprop)=[ '"]([^'"]*))?[^>]*(?:[^>]*content=["]([^"]*)["])?[^>]*>/gi;
    const matches = content.match(metaTagHTMLRegex);
    const meta = {};

    if (matches) {
        const metaPropertyRegex = /<meta[^>]*(?:name|itemprop)=[ "]([^"]*)[^>]*>/i;
        const metaContentRegex = /<meta[^>]*content=[ "]([^"]*)[^>]*>/i;

        matches.forEach((match) => {
            let metaName;
            let metaValue;
            let propertyMatch;
            let contentMatch;

            try {
                propertyMatch = metaPropertyRegex.exec(match);
                contentMatch = metaContentRegex.exec(match);

                if (!propertyMatch || !contentMatch) {
                    return;
                }

                metaName = propertyMatch[1].trim();
                metaValue = contentMatch[1].trim();

                if (!metaName || !metaValue) {
                    return;
                }
            } catch (error) {
                if (__DEV__) {
                    console.log(error);
                }

                return;
            }

            if (metaValue.length > 0) {
                if (metaValue[0] === '/') {
                    if (metaValue.length <= 1 || metaValue[1] !== '/') {
                        if (url[url.length - 1] === '/') {
                            metaValue = `${url}${metaValue.substring(1)}`;
                        } else {
                            metaValue = `${url}${metaValue}`;
                        }
                    } else {
                        // handle protocol agnostic meta URLs
                        if (url.indexOf('https://') === 0) {
                            metaValue = `https:${metaValue}`;
                        }
                        if (url.indexOf('http://') === 0) {
                            metaValue = `http:${metaValue}`;
                        }
                    }
                }
            } else {
                return;
            }

            meta[metaName] = entities.decode(metaValue);
        });

        if (!meta.title) {
            const titleRegex = /<title>([^>]*)<\/title>/i;
            const titleMatch = content.match(titleRegex);

            if (titleMatch) {
                meta.title = entities.decode(titleMatch[1]);
            }
        }
    }

    return meta;
}

function parseMeta(html, url, options) {
    let meta = findOGTags(html, url);

    if (options.fallbackOnHTMLTags) {
        try {
            meta = {
                ...findHTMLMetaTags(html, url),
                ...meta,
            };
        } catch (error) {
            if (__DEV__) {
                console.log(error);
            }
        }
    }

    return meta;
}

async function fetchHtml({ urlToFetch, forceGoogle = false, followRedirects = true }) {
    let result;

    let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36';

    if (forceGoogle) {
        userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    }

    try {
        result = await fetch(urlToFetch, {
            method: 'GET',
            headers: {
                'user-agent': userAgent,
            },
            redirect: followRedirects ? 'follow' : 'manual',
        });

        if (result.status >= 400) {
            throw result;
        }

        const resultParsed = await result.text();
        return resultParsed;
    } catch (responseOrError) {
        if (responseOrError.message && __DEV__) {
            if (responseOrError.message === 'Network request failed') {
                console.log(`Failed to fetch url ${urlToFetch}`);
            } else {
                console.log(`Failed to fetch url ${urlToFetch}`);
            }
            return null;
        }

        const responseOrErrorParsed = await responseOrError.text();
        console.log(responseOrErrorParsed);
        return null;
    }
}

async function fetchJSON({ urlToFetch, urlOfVideo }) {
    try {
        const result = await fetch(urlToFetch, { method: 'GET' });

        if (result.status >= 400) {
            throw result;
        }

        const resultParsed = await result.json();

        return {
            title: resultParsed.title,
            image: resultParsed.thumbnail_url,
            url: urlOfVideo,
        };
    } catch (error) {
        if (__DEV__) {
            console.log(error);
            console.log(`Failed to fetch url ${urlToFetch}`);
        }
    }
}

function getUrls(contentToMatch) {
    const regexp = /((?:(http|https|Http|Https)?:?\/?\/?(?:(?:[a-zA-Z0-9\$\-_\.\+!\*'\(\),;\?&=]|(?:%[a-fA-F0-9]{2})){1,64}(?::(?:[a-zA-Z0-9\$\-_\.\+!\*'\(\),;\?&=]|(?:%[a-fA-F0-9]{2})){1,25})?@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:[a-z]{1,63}))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?::\d{1,5})?)(\/(?:(?:[a-zA-Z0-9;\/\?:@&=#~\-\.\+!\*'\(\),_])|(?:%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi; // eslint-disable-line
    const urls = contentToMatch.match(regexp);
    const urlsToReturn = [];

    if (urls && urls.length) {
        urls.forEach((url) => {
            if (url.toLowerCase().indexOf('http') === 0) {
                urlsToReturn.push(url);
            } else {
                urlsToReturn.push(`http://${url}`);
            }
        });
    } else if (__DEV__) {
        if (__DEV__) {
            console.log(error);
            console.log('Could not find html link');
        }
    }
    return urlsToReturn;
}

async function extractMeta(textContent = '', options = { fallbackOnHTMLTags: true }) {
    try {
        const urls = getUrls(textContent);
        let metaData = null;

        await Promise.all(urls.map(async (url) => {
            if (url.indexOf('youtube.com') >= 0) {
                metaData = await fetchJSON({ urlToFetch: `https://www.youtube.com/oembed?url=${url}&format=json`, urlOfVideo: url });
            } else {
                const html = await fetchHtml({ urlToFetch: url });
                metaData = {
                    ...html ? parseMeta(html, url, options) : {},
                    url,
                };
            }
        }));

        return metaData;
    } catch (error) {
        if (__DEV__) {
            console.log(error);
        }

        return {};
    }
}

module.exports = {
    extractMeta,
    // Exporting for testing
    findOGTags,
    findHTMLMetaTags,
};
