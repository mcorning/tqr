const jLog = (json, msg = 'json:') =>
  console.log(msg, JSON.stringify(json, null, 2));

const reduceMap = (map) =>
  map.reduce((a, c) => {
    const key = c[0];
    const v = c[1];
    jLog(v, 'reduceMap v: >>');
    if (Array.isArray(v[0][1])) {
      a.push(key, v[0][1]);
    } else {
      a.push(key, v[1]);
    }

    return a;
  }, []);

const showMap = () => {
  const map = [
    [
      'tqr:us:PopsBBQTruck:promos',
      [
        [
          '1648844098743-0',
          [
            'promoName',
            "Get Sauced at Pop's",
            'promoUrl',
            'https://www.popsouthernbbq.com/menu',
          ],
        ],
        [
          '1648844098743-1',
          [
            'promoName',
            'Spring Break breaks',
            'promoUrl',
            'https://www.popsouthernbbq.com/menu',
          ],
        ],
      ],
    ],
  ];
  const nonce = map[0][0];
  console.log(nonce);
  const values = map[0][1].flat();
  jLog(values, 'values :>>');
  const mapArray = values.map((v) => {
    reduceMap(v);
  });

  jLog(mapArray, 'promo:');
  return mapArray;
};
const showMap2 = () => {
  const map = [
    ['1648844098723-0', ['nonce', 'PopsBBQTruck']],
    ['1648844098728-0', ['nonce', 'PopsBBQTruck@TheBarn']],
  ];
  const mapArray = reduceMap(map);

  jLog(mapArray, 'connections: >>');
  return mapArray;
};

showMap();
showMap2();
