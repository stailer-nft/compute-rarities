const fs = require("fs");
const decimal = require("decimal.js");
const basePath = process.cwd();

let rawdata = fs.readFileSync(`${basePath}/collection/json/_metadata.json`);
let nftCollection = JSON.parse(rawdata);
let collectionSize = nftCollection.length;

decimal.config({
    precision: 18,
});

const resolve = () => {
    const categoryCount = {};
    const traitsPerCategoryCount = {};

    for (const nft of nftCollection) {
        for (const attribute of nft.attributes) {
            if (typeof categoryCount[attribute.trait_type] === "undefined") {
                categoryCount[attribute.trait_type] = 0;
            }

            categoryCount[attribute.trait_type] += 1;

            if (
                typeof traitsPerCategoryCount[attribute.trait_type] ===
                "undefined"
            ) {
                traitsPerCategoryCount[attribute.trait_type] = {
                    [attribute.value]: 0,
                };
            }

            if (
                typeof traitsPerCategoryCount[attribute.trait_type][
                    attribute.value
                ] === "undefined"
            ) {
                traitsPerCategoryCount[attribute.trait_type][
                    attribute.value
                ] = 0;
            }

            traitsPerCategoryCount[attribute.trait_type][attribute.value] += 1;
        }
    }

    let sumTraitsPerCat = 0;

    Object.keys(traitsPerCategoryCount).forEach((category) => {
        sumTraitsPerCat += Object.keys(traitsPerCategoryCount[category]).length;
    });

    const get_avg_trait_per_cat =
        sumTraitsPerCat / Object.keys(traitsPerCategoryCount).length;

    let traitMap = {};

    for (const traitType of Object.keys(categoryCount)) {
        let valueMap = {};

        for (const attribute of Object.keys(
            traitsPerCategoryCount[traitType]
        )) {
            let attributeOccurrence =
                traitsPerCategoryCount[traitType][attribute];
            let attributeFrequency = attributeOccurrence / collectionSize;
            let attributeRarity = 1 / attributeFrequency;
            let traitOccurancePercentage =
                (categoryCount[traitType] / collectionSize) * 100;
            let traitFrequency = categoryCount[traitType] / collectionSize;
            valueMap = {
                ...valueMap,
                [attribute]: {
                    attributeOccurrence,
                    attributeFrequency,
                    attributeRarity,
                    traitOccurance: categoryCount[traitType],
                    traitFrequency,
                    traitOccurancePercentage: parseFloat(
                        traitOccurancePercentage.toString()
                    ),
                },
            };
        }
        traitMap = { ...traitMap, [traitType]: { ...valueMap } };
    }

    for (const nft of nftCollection) {
        let statRarity = new decimal(1);
        let avgRarity = 0;
        let rarityScore = 0;
        let rarityScoreNormed = 0;

        const attributes = nft.attributes;

        for (const attribute of attributes) {
            traitMap[attribute.trait_type][
                attribute.value
            ].attributeRarityNormed =
                traitMap[attribute.trait_type][attribute.value]
                    .attributeRarity *
                (get_avg_trait_per_cat / attributes.length);
            avgRarity +=
                traitMap[attribute.trait_type][attribute.value]
                    .attributeFrequency;
            statRarity = statRarity.mul(
                traitMap[attribute.trait_type][attribute.value]
                    .attributeFrequency
            );
            rarityScore +=
                traitMap[attribute.trait_type][attribute.value].attributeRarity;
            rarityScoreNormed +=
                traitMap[attribute.trait_type][attribute.value]
                    .attributeRarityNormed;
        }

        // const rarity = nft.getRarity() || {};
        const rarity = {};

        rarity.avgRarity = parseFloat(
            (avgRarity / attributes.length).toFixed(6)
        );
        rarity.statRarity = new decimal(statRarity.toPrecision(10)).toNumber();
        rarity.rarityScore = parseFloat(rarityScore.toFixed(6));
        rarity.rarityScoreNormed = parseFloat(rarityScoreNormed.toFixed(6));
        rarity.usedTraitsCount = attributes.length;

        console.log(rarity);

        const filePath = `${basePath}/collection/json/${nft.edition}.json`;
        const nftContents = fs.readFileSync(filePath);
        const nftJSON = JSON.parse(nftContents);

        nftJSON.rarity = rarity;
        delete nftJSON.image;

        fs.writeFileSync(filePath, JSON.stringify(nftJSON, null, 2));
    }

    console.log(traitMap);
    fs.writeFileSync(
        `${basePath}/collection/json/collection.json`,
        JSON.stringify(traitMap, null, 2)
    );
};

resolve();
