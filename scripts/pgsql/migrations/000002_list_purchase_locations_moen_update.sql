begin;
    delete from list
        where list_id = 'purchase_location'
            and key_id in ('meetflo', 'amazon', 'plumber', 'lennar', 'camewithhome', 'other', 'ns','homeimprovementstore')
            and lang in ('en', 'es', 'fr');

    insert into list (list_id, key_id, short_display, long_display, "state", "order", lang)
    values
    -- EN
        ('purchase_location', 'moen', 'moen.com', 'Moen.com', 1, 0, 'en'),
        ('purchase_location', 'amazon', 'amazon.com', 'Amazon.com', 1, 1, 'en'),
        ('purchase_location', 'homeimprovementstore', 'Home improvement store', 'Home improvement store', 1, 2, 'en'),
        ('purchase_location', 'plumber', 'Plumber', 'Plumber', 1, 3, 'en'),
        ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'en'),
        ('purchase_location', 'camewithhome', 'Came with my home', 'Came with my new home', 1, 5, 'en'),
        ('purchase_location', 'other', 'Other', 'Other source', 1, 6, 'en'),
        ('purchase_location', 'unknown', 'Not sure', 'Not Sure', 1, 7, 'en'),
    -- ES
        ('purchase_location', 'moen', 'moen.com', 'Moen.com', 1, 0, 'es'),
        ('purchase_location', 'amazon', 'amazon.com', 'Amazon.com', 1, 1, 'es'),
        ('purchase_location', 'homeimprovementstore', 'Tienda para el hogar', 'Tienda de mejoras para el hogar', 1, 2, 'es'),
        ('purchase_location', 'plumber', 'Plomero', 'Plomero', 1, 3, 'es'),
        ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'es'),
        ('purchase_location', 'camewithhome', 'Vine con mi hogar', 'Vine con mi nuevo hogar', 1, 5, 'es'),
        ('purchase_location', 'other', 'Otros', 'Otros', 1, 6, 'es'),
        ('purchase_location', 'unknown', 'No sé', 'No sé', 1, 7, 'es'),
    -- FR
        ('purchase_location', 'moen', 'moen.com', 'Moen.com', 1, 0, 'fr'),
        ('purchase_location', 'amazon', 'amazon.com', 'Amazon.com', 1, 1, 'fr'),
        ('purchase_location', 'homeimprovementstore', 'Magasin de rénovation domiciliaire', 'Magasin de rénovation domiciliaire', 1, 2, 'fr'),
        ('purchase_location', 'plumber', 'Plombier', 'Plombier', 1, 3, 'fr'),
        ('purchase_location', 'lennar', 'Lennar', 'Lennar', 1, 4, 'fr'),
        ('purchase_location', 'camewithhome', 'Suis venu avec maison', 'Suis venu avec ma nouvelle maison', 1, 5, 'fr'),
        ('purchase_location', 'other', 'Autres', 'Autres', 1, 6, 'fr'),
        ('purchase_location', 'unknown', 'Pas certain', 'Pas certain', 1, 7, 'fr')
    on conflict on constraint list_pkey do nothing;

    commit;

end;
