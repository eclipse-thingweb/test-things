#!/bin/bash

return_value=0

# logic for every tm test directory (tmd)
for tmd in things/* ; do
    tm_test_path="$tmd/*.test.js"
    if [ ! -f $tm_test_path ]; then
        continue
    fi 
    
    echo "* Testing $(basename $tmd)..."
    tm_result="$(node_modules/mocha/bin/mocha.js $tm_test_path)"
    tm_exit_code=$?

    if [ $tm_exit_code -ne 0 ]; then
        echo -e "\033[0;31m** TM test failed for the thing '$(basename $tmd)'. TDs will not be tested.\033[0m"
        echo $tm_result
        echo "-----"
        return_value=1
        continue
    else
        echo -e "\033[0;32m** TM test successful for $tmd.\033[0m"
        # logic for every td test directory (tdd)
        for tdd in $tmd/*/* ; do
            td_test_path="$tdd/test"

            if [ ! -d $td_test_path ]; then
                continue
            fi 

            current_path=$(pwd)
            cd $tdd
            td_result="$(../../../../node_modules/mocha/bin/mocha.js --exit --timeout 5000)"
            td_exit_code=$?
            cd $current_path

            if [ $td_exit_code -ne 0 ]; then
                echo -e "\033[0;31m** TD test failed for the thing $tdd.\033[0m"
                echo $td_result
                return_value=1
                continue
            else
                echo -e "\033[0;32m** TD test successful for $tdd.\033[0m"
            fi
        done
        echo "-----"
    fi
done

exit $return_value
