exports.getPosts = (req,res,next)=>{
    return res.status(200).json({
        posts:[{
            title:'First Post',
            content:'This is the first post!'
        }]
    });
}
exports.createPost = (req,res,next)=>{
    const {title , content} = req.body;
    return res.status(201).json({
        message:"Post created Successfully ",
        post : {id:new Date().toISOString(),title,content}
    });
}