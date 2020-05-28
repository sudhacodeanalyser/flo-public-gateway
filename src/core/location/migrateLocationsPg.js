const AWS = require('aws-sdk');
const _ = require('lodash');
const squel = require('squel');
const ENV = 'prod';
const pg = require('pg');

function pageThru(dynamoClient, doOnPage, ExclusiveStartKey) {
  return dynamoClient.scan({
    TableName: `${ ENV }_Location`,
    ExclusiveStartKey
  })
  .promise()
  .then(({ Items, LastEvaluatedKey }) => {
    return Promise.all([
      Items.length && doOnPage(Items),
      LastEvaluatedKey && pageThru(doOnPage, LastEvaluatedKey)
    ]);
  });
}


function convertDynamoToPg(location) {
  const columns = Object.assign(
    {
      id: location.location_id,
      postal_code: location.postalcode,
      created_at: location.created_at || new Date(0).toISOString(),
      updated_at: location.updated_at || new Date().toISOString(),
      system_mode_target: location.target_system_mode,
      system_mode_revert_minutes: location.revert_minutes,
      system_mode_revert_mode: location.revert_mode,
      system_mode_revert_scheduled_at: location.revert_scheduled_at,
      type: (() => {
        if (location.profile && location.profile.location_type) {
          return location.profile.location_type;
        }

        switch (input.location_type) {
          case 'apt':
            return 'apartment';
          default:
            return input.location_type;
        }

      })(),
      location_size: (() => {
        if (location.profile && location.profile.location_size) {
          return location.profile.location_size;
        }

        return [
          'lt_700_sq_ft',
          'lte_1000_sq_ft',
          'lte_2000_sq_ft',
          'lte_4000_sq_ft',
          'gt_4000_sq_ft'
        ][location.location_size_category];
      })(),
      plumbing_type: (() => {
        if (location.profile && location.profile.plumbing_type) {
          return location.profile.plumbing_type;
        } else if (location.galvanized_plumbing == 1) {
          return 'galvanized';
        } else if (location.galvanized == 0) {
          return 'copper';
        } else {
          return undefined;
        }
      })(),
      indoor_amenities: JSON.stringify((() => {
        if (location.profile && location.profile.indoor_amenities) {
          return location.profile.indoor_amenities;
        }

        const kitchen = (location.kitchen_amenities || [])
          .map(amenity => {
            switch (amenity.toLowerCase().split(' ')[0]) {
              case 'dishwasher':
                return 'dishwasher';
              case 'fridge':
                return 'icemaker_ref'
              case 'washer':
                return 'clotheswasher';
              default:
                return undefined;
            }
          })
          .filter(_.identity);
        const bathroom = (location.bathroom_amenities || [])
          .map(amenity => {
            switch (amenity.toLowerCase().split(' ')[0]) {
              case 'bathtub':
                return 'bathtub';
              case 'hot':
              case 'spa':
                return 'hottub';
              default:
                return undefined;
            }
          })
          .filter(_.identity);

          return kitchen.concat(bathroom);
      })()),
      outdoor_amenities: JSON.stringify((() => {
        if (location.profile && location.profile.outdoor_amenities) {
          return location.profile.outdoor_amenities;
        }

        return (location.outdoor_amenities || [])
          .map(amenity => {
            switch (amenity.toLowerCase().split(' ')[0]) {
              case 'swimming': 
                return 'pool';
              case 'fountains':
                return 'fountain';
              case 'spa':
              case 'hot':
                return 'hottub';
              default:
                return undefined;
            }
          })
          .filter(_.identity);
      })()),
      plumbing_appliances: JSON.stringify((() => {
        if (location.profile && location.profile.plumbing_appliances) {
          return location.profile.plumbing_appliances;
        }

        return [
          location.hot_water_recirculation == 1 &&
            're_pump',
          location.water_filtering_system == 1 &&
            'home_filter',
          location.tankless == 1 &&
            'tankless',
          location.expansion_tank == 1 &&
            'exp_tank',
          location.whole_house_humidifier == 1 &&
            'home_humidifier'
        ]
        .filter(_.identity);
      })()),
      areas: location.areas && JSON.stringify(location.areas)
    },
    _.pick(location, [
      'parent_location_id',
      'account_id',
      'address',
      'address2',
      'city',
      'country',
      'timezone',
      'gallons_per_day_goal',
      'occupants',
      'stories',
      'is_profile_complete',
      'created_at',
      'nickname',
      'is_irrigation_schedule_enabled',
      'residence_type',
      'water_source',
      'water_shutoff_known',
      'location_class'
    ]),
    _.pick(location.profile || {}, [
      'home_owners_insurance',
      'has_past_water_damage',
      'shower_bath_count',
      'toilet_count',
      'water_shutoff_known',
      'past_water_damage_claim_amount',
      'water_utility'
    ])
  );

  return _.pickBy(columns, _.identity);
}

function upsert(pgClient, location) {
  const queryBuilder = squel.useFlavour('postgres')
    .insert()
    .into('"location"');

  _.forEach(location, (value, column) => {
    queryBuilder.set(`"${ column }"`, value);
  });


  const {
    id,
    ...cols
  } = location;

  queryBuilder.onConflict('id', _.mapKeys(cols, (value, key) => `"${ key }"`));

  const { text, values } = queryBuilder.toParam();

  return pgClient.query(text, values);
}

const dynamoClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });
const pgClient = new pg.Pool({
  user: 'flo-list-service',
  password: 'KrirtyifCidv@hakIt2admaquoag',
  host: 'dev-rds-cherry.dev.flocloud.co',
  database: 'core',
  port: 5432
});

pgClient.connect()
  .then(() => {
    return pageThru(dynamoClient, locations => {
      const promises = locations
        .filter(location => location.is_profile_complete)
        .map(convertDynamoToPg)
        .map(pgLoc => 
          upsert(pgClient, pgLoc).then(() => console.log(pgLoc))
        );

      return Promise.all(promises);
    });
  })
  .catch(err => console.log(err));