const getFilter = (query = {}) => {
  const queryType = typeof query;

  if (queryType === 'function') {
    return query;
  } else if (queryType === 'object') {
    const filter = (val) => {
      for (const property in query) {
        if (Object.hasOwnProperty.call(query, property)) {
          if (val[property] !== query[property]) {
            return false;
          }
        }
      }
      return true;
    };

    return filter;
  } else {
    throw new Error(`query should be a function or object, but got a ${queryType}`);
  }
};

export default (db, updateInterval) => {
  db.insert = async function(...data) {
    await db.read();

    if (!db.data?.values) {
      db.data = {values: []};
    }

    db.data.values.push(...data);

    return db.write();
  };

  db.find = async function(query) {
    const filter = getFilter(query);

    await db.read();

    if (!db.data) {
      return [];
    }

    const value = db.data.values.filter(filter);

    return value;
  };

  db.findOne = async function(query) {
    const filter = getFilter(query);

    await db.read();

    if (!db.data) {
      return;
    }

    const value = db.data.values.find(filter);

    return value;
  };

  db.update = async function(query, data) {
    const filter = getFilter(query);

    await db.read();

    if (!db.data) {
      return;
    }

    const {values} = db.data;

    const index = values.findIndex(filter);

    if (index === -1) {
      return;
    }

    values[index] = {
      ...values[index],
      ...data,
    };

    await db.write();

    return values[index];
  };

  if (updateInterval && process.env.NODE_ENV !== 'test') {
    setInterval(() => db.write(), updateInterval);
  }

  return db;
};
