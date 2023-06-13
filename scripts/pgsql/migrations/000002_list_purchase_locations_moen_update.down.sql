delete from list
    where list_id = 'purchase_location'
    and key_id in ('meetflo', 'amazon', 'plumber', 'lennar', 'camewithhome', 'other', 'ns','homeimprovementstore')
    and lang in ('en', 'es', 'fr');
