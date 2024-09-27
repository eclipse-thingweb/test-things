/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

const chai = require("chai");
const fs = require("fs");
const path = require("path");
const { getTDValidate } = require("../../../../../util/dist/util");

const expect = chai.expect;

describe("Elevator Modbus JS", () => {
    let validate;

    before(async () => {
        const tdValidate = getTDValidate();

        try {
            const response = await Promise.all([tdValidate]);
            validate = response[0].validate;
        } catch (error) {
            console.log(error);
        }
    });

    it("should have a valid TD", (done) => {
        fs.readFile(
            path.join(__dirname, "../modbus-elevator.td.json"),
            "utf-8",
            (err, data) => {
                if (err) {
                    console.log(err);
                    done(err);
                }

                const result = JSON.parse(data.toString());
                const valid = validate(result);
                expect(valid).to.be.true;
                done();
            },
        );
    });
});
