class Book{
    constructor(id, name, description, start, 
        price, view, content, url, sound){
        this.id = id;
        this.name = name;
        this.description = description;
        this.start = start;
        this.price = price;
        this.view = view;
        this.content = content;
        this.url = url;
        this.sound = sound;
    }
}


module.exports = Book;