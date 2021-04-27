
BEGIN;
    -- EN
    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'meetflo', 'meetflo.com', 'flo website', 1, 0, 'en') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'amazon', 'amazon.com', 'amazon website', 1, 1, 'en') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'homeimprovementstore', 'Home improvement store', 'Home improvement store', 1, 2, 'en')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'plumber', 'Plumber', 'Plumber', 1, 3, 'en')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'en')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'other', 'Other', 'Other source', 1, 5, 'en')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'unknown', 'Not sure', 'Not sure', 1, 6, 'en')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    -- ES
    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'meetflo', 'meetflo.com', 'sitio web de flo', 1, 0, 'es') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'amazon', 'amazon.com', 'sitio web de amazon', 1, 1, 'es') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'homeimprovementstore', 'Tienda para el hogar', 'Tienda de mejoras para el hogar', 1, 2, 'es')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'plumber', 'Plomero', 'Plomero', 1, 3, 'es')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'es')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'other', 'Otros', 'Otros', 1, 5, 'es')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'unknown', 'No sé', 'No sé', 1, 6, 'es')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    -- FR
    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'meetflo', 'meetflo.com', 'site web flo', 1, 0, 'fr') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'amazon', 'amazon.com', 'site web amazon', 1, 1, 'fr') 
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'homeimprovementstore', 'Magasin de rénovation domiciliaire', 'Magasin de rénovation domiciliaire', 1, 2, 'fr')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'plumber', 'Plombier', 'Plombier', 1, 3, 'fr')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'fr')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'other', 'Autres', 'Autres', 1, 5, 'fr')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    INSERT INTO list (list_id, key_id, short_display, long_display, "state", "order", lang) VALUES ('purchase_location', 'unknown', 'Pas certain', 'Pas certain', 1, 6, 'fr')
    ON CONFLICT ON CONSTRAINT list_pkey DO NOTHING;

    COMMIT;
END;
