const fs = require( 'fs' );

const removeImageFile = (newFilename, oldFilename) => {
    const imagePath = `public/images/user/${newFilename}`;
    
    // Check if the file exists
    if (fs.existsSync(imagePath)) {
        try {
            // Attempt to remove the file
            fs.unlinkSync(imagePath);
            console.log("Old Profile Picture has been Deleted");
        } catch (error) {
            console.log("Error while removing image file", error);
            throw error;
        }
    } else {
        //if file does not exist then delete the uploaded image from the folder
        // console.log("new added file name:", oldFilename);
        fs.unlinkSync(`public/images/user/${oldFilename}`)
        console.log("File does not exist.");
        throw  new Error('No such File present');
    }
}

module.exports = {removeImageFile};