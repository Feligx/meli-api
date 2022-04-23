const  express = require('express');
let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const cors = require('cors');

const meli_results = 'https://api.mercadolibre.com/sites/MLA/search?q=';
const meli_product_details = 'https://api.mercadolibre.com/items/';
const meli_categories = 'https://api.mercadolibre.com/categories/';

const app = express();
const PORT = process.env.PORT || 3000;

const whitelist= ['http://localhost:8080', 'https://feligx.github.io'];
const options = {
    origin: function(origin, callback){
        if(whitelist.includes(origin) || !origin){
            callback(null, true);
        }else{
            callback(new Error('Not allowed by CORS'));
        }
    }
}
app.use(cors(options));

const fetchData= (url_api) => {

    return new Promise((resolve, reject)=>{
        const xhttp = new XMLHttpRequest();

        xhttp.open('GET', url_api, true);
        xhttp.onreadystatechange= (() =>{
            if(xhttp.readyState === 4){
                (xhttp.status===200)
                    ?resolve(JSON.parse(xhttp.responseText))
                    :reject(new Error('Error', url_api))
            }
        })
        xhttp.send();
    });
}

app.get('/api/items', async (request, response)=> {
    const {q} = request.query
    if (q) {
        const data = await fetchData(meli_results+q);

        const _itemsPerPage = 4; //con un limite de 50 por la API de MELI
        let categories =[], items = [];

        for(let i = 0; i < _itemsPerPage; i++){
            categories.push(data.results[i].category_id);
            items.push({
                "id": data.results[i].id,
                "title": data.results[i].title,
                "price": {
                    "currency": data.results[i].currency_id,
                    "amount": data.results[i].price,
                    "decimals": ""
                },
                "picture": data.results[i].thumbnail,
                "condition": data.results[i].condition,
                "address": data.results[i].address.state_name,
                "free_shipping": data.results[i].shipping.free_shipping
            });
        };

        response.json({
        "categories": categories,
        "items": items
       });
    } else {
        response.status(404).json(
            {
                status: 404,
                message:"Huh?! No tengo nada para esto ¯|_(ツ)_/¯"
            }
            );
    }
})

app.get('/api/items/:id', async (request, response)=>{
    const { id } = request.params;

    const item_data = await fetchData(meli_product_details+id);
    const item_description = await fetchData(meli_product_details+id+"/description");
    response.json({
        "item": {
            "id": item_data.id,
            "title": item_data.title,
            "category_id": item_data.category_id,
            "price": {
                "currency": item_data.currency_id,
                "amount": item_data.price,
                "decimals": Number,
            },
            "picture": item_data.pictures[0].secure_url,
            "condition": item_data.condition,
            "free_shipping": item_data.shipping.free_shipping,
            "sold_quantity": item_data.sold_quantity,
            "description": item_description.plain_text
        }
       }
       );
})

app.get('/api/categories/:id', async (request, response)=>{
    const { id } = request.params;

    const category_data = await fetchData(meli_categories+id);

    const parent_links = [];

    for(let i = 0; i < category_data.path_from_root.length; i++){
        const link = await fetchData(meli_categories+category_data.path_from_root[i].id);
        parent_links.push(link.permalink);
    }

    response.json({
        id: id,
        name: category_data.name,
        parents: category_data.path_from_root.map(category => category.name),
        parents_permalinks: parent_links
    })
});

app.listen(PORT, ()=>{
})